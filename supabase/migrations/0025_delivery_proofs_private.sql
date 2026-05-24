-- ═══════════════════════════════════════════════════════════════════
-- Migration 0025: delivery-proofs bucket → PRIVATE (privacy fix)
--
-- Why this migration exists
-- ─────────────────────────
-- The `delivery-proofs` Storage bucket was provisioned (via Studio /
-- Management API, NOT a prior migration — see 0019 §"We DO NOT create
-- the bucket here") with `public = true`. A public bucket means every
-- object is reachable by anyone who knows (or guesses) its URL — no auth
-- required. Delivery-proof photos show a member's porch / front door /
-- the delivered box, so a public bucket leaks members' homes to the open
-- internet. The upload handler stored `getPublicUrl(path)` on
-- `delivery_stops.proof_photo_url`, so those URLs were live and shareable.
--
-- This migration FLIPS THE BUCKET public → PRIVATE. After this:
--   * No object is reachable without a credential.
--   * Display happens via SHORT-LIVED SIGNED URLs minted server-side
--     (createSignedUrl) only after the caller is proven authorized:
--       - admin route page  → admin already verified (requireAdmin / RLS)
--       - member tracker     → member's own stop already RLS-scoped before
--                              the URL is signed (see src/lib/delivery.ts +
--                              src/pages/admin/route/[id].astro)
--   * The upload handler now stores the OBJECT PATH (not a public URL) on
--     proof_photo_url; the read paths convert path → signed URL.
--
-- Storage RLS (storage.objects)
-- ─────────────────────────────
-- Before: two policies existed —
--   delivery_proofs_admin_write          FOR ALL  (admin)            — KEEP
--   delivery_proofs_authenticated_read   FOR SELECT (ANY authed user) — TOO BROAD
-- The broad read policy let ANY logged-in member read ANY other member's
-- proof photo via the storage API (cross-member access). We DROP it and
-- replace it with a member-scoped read policy that mirrors the
-- `delivery_stops_member_read` predicate (0019 §7): a member may read a
-- proof object ONLY if the stop_id embedded in the object path
-- (`{route_date}/{stop_id}.{ext}`) belongs to a delivery_stop tied to
-- their own pickup_location or their own member_id. Cross-member access
-- becomes impossible at the database layer.
--
-- (Service role bypasses RLS, so the server-side signer — supabaseAdmin
-- in the API/SSR paths — can always mint a signed URL after it has
-- independently confirmed ownership via the RLS-scoped delivery_stops
-- query. The member-scoped read policy is defense-in-depth: even a raw
-- member-token call to storage cannot reach another member's photo.)
--
-- Safety / timing
-- ───────────────
-- SAFE TO RUN NOW: no proof photos exist yet — the 2026 delivery season
-- starts 2026-06-10, so no objects are stored and no proof_photo_url rows
-- are populated. Flipping public→private therefore breaks nothing live;
-- it only changes the policy for objects created from the first delivery
-- onward (which will be stored as paths + served via signed URLs).
--
-- Forward-only. Apply via Supabase Management API
-- (scripts/migrate-csa/run_migration.py).
--
-- APPLIED 2026-05-24 to project melizsvabemhaqeaqtyw. Note: the
-- Management API runs as `postgres`, which is NOT a member of
-- `supabase_storage_admin` (the owner of storage.objects). DROP/CREATE
-- POLICY on storage.objects + UPDATE storage.buckets all succeed as
-- postgres when run as SEPARATE statements, but bundling a CREATE POLICY
-- after a DROP inside one BEGIN/COMMIT submission tripped a transient
-- "42501 must be owner" rollback. This file is written idempotently
-- (DROP IF EXISTS before CREATE) and is safe to re-run; if a hosted
-- environment rejects the policy DDL via the Management API, apply the
-- policy statements through the Supabase Studio SQL editor (which runs
-- with storage-admin privileges). The bucket flip + final policy set
-- below match the verified live state.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. Flip the bucket to PRIVATE.
--    (Keep the existing size limit + MIME allow-list untouched.)
-- ───────────────────────────────────────────────────────────────────
UPDATE storage.buckets
   SET public = false
 WHERE id = 'delivery-proofs';

-- ───────────────────────────────────────────────────────────────────
-- 2. Drop the over-broad "any authenticated user can read" policy.
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS delivery_proofs_authenticated_read ON storage.objects;

-- ───────────────────────────────────────────────────────────────────
-- 3. Member-scoped read policy — mirrors delivery_stops_member_read.
--
-- Object path convention (set by the upload handler):
--     {route_date}/{stop_id}.{ext}
-- So the stop_id is the final path segment with its extension stripped.
-- We derive it with storage.filename(name) minus the extension and cast
-- to uuid; a malformed/legacy name simply matches no stop and is denied.
-- (DROP IF EXISTS first so this migration is idempotent / re-runnable.)
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS delivery_proofs_member_read ON storage.objects;

CREATE POLICY delivery_proofs_member_read ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'delivery-proofs'
    AND EXISTS (
      SELECT 1
        FROM delivery_stops s
       WHERE
         -- stop_id embedded in the object name: strip the leading
         -- "{route_date}/" folder and the trailing ".{ext}".
         s.id = NULLIF(
                  regexp_replace(
                    split_part(storage.objects.name, '/', 2),  -- "{stop_id}.{ext}"
                    '\.[^.]+$', ''                              -- drop ".ext"
                  ),
                  ''
                )::uuid
         AND (
           -- Host stop the member's pickup_location matches
           (
             s.pickup_location_id IS NOT NULL
             AND s.pickup_location_id IN (
               SELECT pickup_location_id
                 FROM members
                WHERE customer_id = current_customer_id()
                  AND pickup_location_id IS NOT NULL
             )
           )
           OR
           -- Home-delivery stop targeting the member themselves
           (
             s.member_id IS NOT NULL
             AND s.member_id IN (
               SELECT id
                 FROM members
                WHERE customer_id = current_customer_id()
             )
           )
         )
    )
  );

COMMENT ON POLICY delivery_proofs_member_read ON storage.objects IS
  'A member may read a delivery-proof object only if the stop_id in its path ({route_date}/{stop_id}.{ext}) belongs to a delivery_stop tied to their own pickup_location or member_id. Mirrors delivery_stops_member_read. Replaces the old delivery_proofs_authenticated_read which let any authed user read any object.';

-- delivery_proofs_admin_write (FOR ALL, is_admin_caller()) is LEFT INTACT
-- — admins keep full read+write. Service role bypasses RLS for signing.

COMMIT;
