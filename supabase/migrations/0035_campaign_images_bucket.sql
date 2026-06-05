-- ═══════════════════════════════════════════════════════════════════
-- Migration 0035: campaign-images PUBLIC storage bucket
--
-- Backs Feature 4 (rich-text editor image insert) of the campaign-tool
-- upgrade. The WYSIWYG editor lets Todd drag-drop / file-pick an image;
-- the upload API (/api/admin/campaigns/image) stores it here and inserts
-- an absolute public URL into the email body.
--
-- ── Why PUBLIC (unlike delivery-proofs, migration 0025) ──────────────
--   Campaign images are embedded in OUTBOUND EMAIL. Email clients
--   (Gmail, Apple Mail, Outlook) fetch <img src> with NO auth header and
--   cannot follow a short-lived signed URL — the image must be reachable
--   at a stable, credential-free URL or it renders broken in every
--   member's inbox. So this bucket is intentionally PUBLIC. The content
--   is marketing imagery Todd is broadcasting to the whole list anyway —
--   there's no privacy expectation, unlike a member's porch photo.
--
-- ── Write access ─────────────────────────────────────────────────────
--   Uploads are gated at the application layer (/api/admin/campaigns/image
--   → isSameOriginPost + requireAdmin, then service-role upload). A
--   storage RLS write policy for authenticated admins is added as
--   defense-in-depth. Public read; admin-only write/update/delete.
--
-- ── Limits ───────────────────────────────────────────────────────────
--   5 MB max object, image MIME allow-list (png/jpeg/gif/webp). Mirrors
--   the proof-bucket guardrails so a stray PDF or 50 MB upload is
--   rejected at the storage layer, not just the app.
--
-- ── Idempotency ──────────────────────────────────────────────────────
--   INSERT ... ON CONFLICT (id) DO UPDATE for the bucket row; DROP POLICY
--   IF EXISTS before CREATE for every policy. Safe to re-run.
--
-- ── Apply note (see migration 0025) ──────────────────────────────────
--   The Management API runs as `postgres`, which is not a member of
--   supabase_storage_admin. Bundling the bucket upsert AND the
--   storage.objects policy DDL in ONE submission trips a transient
--   "42501 must be owner of relation objects" rollback. Applying each
--   statement SEPARATELY succeeds as postgres. So when running this file
--   via the Management API, submit it as four separate statements:
--     1. the storage.buckets upsert (section 1)
--     2. DROP + CREATE campaign_images_public_read (section 2)
--     3. DROP + CREATE campaign_images_admin_write (section 3)
--   APPLIED 2026-06-05 to project melizsvabemhaqeaqtyw exactly this way
--   (bucket upsert 201; each policy DROP/CREATE 201). This file as-is is
--   the authoritative record of the live state and is safe to re-run
--   statement-by-statement.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. Create (or update) the bucket — PUBLIC, 5 MB, image MIME allow-list.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images',
  'campaign-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ───────────────────────────────────────────────────────────────────
-- 2. Public read — anyone (anon + authenticated) may read objects.
--    Required so email clients can fetch <img src> with no credential.
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS campaign_images_public_read ON storage.objects;
CREATE POLICY campaign_images_public_read ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'campaign-images');

COMMENT ON POLICY campaign_images_public_read ON storage.objects IS
  'Public read for campaign-images: email clients must fetch embedded images with no auth. Marketing imagery, no privacy expectation.';

-- ───────────────────────────────────────────────────────────────────
-- 3. Admin write/update/delete — defense-in-depth behind the
--    app-layer requireAdmin gate on /api/admin/campaigns/image.
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS campaign_images_admin_write ON storage.objects;
CREATE POLICY campaign_images_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'campaign-images' AND is_admin_caller())
  WITH CHECK (bucket_id = 'campaign-images' AND is_admin_caller());

COMMENT ON POLICY campaign_images_admin_write ON storage.objects IS
  'Admin/staff may write/update/delete campaign-images objects. Service role (the API uploader) bypasses RLS; this is defense-in-depth.';

-- ───────────────────────────────────────────────────────────────────
-- 4. Verification (read-only).
-- ───────────────────────────────────────────────────────────────────
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'campaign-images';

SELECT polname AS policy_name, polcmd AS cmd
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
  AND polname LIKE 'campaign_images%'
ORDER BY polname;
