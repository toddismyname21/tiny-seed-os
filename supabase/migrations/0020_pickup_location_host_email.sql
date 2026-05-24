-- Migration 0020: add host_email column to pickup_locations
-- Adds explicit host contact email field (was crammed into notes before)
-- Date: 2026-05-12
-- Reason: Todd provided structured CSA host contact CSV; we need a dedicated field

ALTER TABLE pickup_locations
  ADD COLUMN IF NOT EXISTS host_email text;

COMMENT ON COLUMN pickup_locations.host_email IS
  'Email for the location host (admin/coordination contact, not member-facing). Use NULL for self-pickup-at-farm or market vendor stalls where no host applies.';
