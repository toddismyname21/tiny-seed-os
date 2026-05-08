-- ═══════════════════════════════════════════════════════════════════
-- Migration 0001: Enable Postgres Extensions
-- Required for case-insensitive emails (citext) and UUID generation
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
