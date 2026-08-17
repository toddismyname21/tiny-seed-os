---
name: csa-stop-notes-feature
description: CSA Stop Notes (by-stop chat Phase 0) — read-only per-pickup notes, the Phase-1 upgrade path, RLS scoping, and where members/admins see/post.
metadata:
  type: project
---

CSA portal "Stop Notes" = Phase 0 of the by-stop chat feature (spec: `docs/specs/CSA_BY_STOP_CHAT_SPEC.md`). Built 2026-05-24 on `csa-migration` (commit 270371f). READ-ONLY for members; staff/host post. See also [[csa-portal-build-gotchas]], [[csa-portal-color-tokens]], [[csa-portal-test-harness]].

**The deliberate phasing — Phase 0 is read-only by RLS omission, NOT by a column or flag.**
- Migration `0029_stop_chat.sql`: `stop_messages` (scoped by `pickup_location_id`, soft-delete `hidden_at`, `author_role` member|staff|host, `report_count`) + `stop_message_reports` (created NOW, stays empty until Phase 1) + `current_member_location_ids()` SECURITY DEFINER helper (status-filtered active/paused/onboarding, built on `current_customer_id()` so households resolve to the owner's stop(s)).
- **Phase 0 RLS:** `stop_messages_member_read` (SELECT, `hidden_at IS NULL AND pickup_location_id IN (SELECT current_member_location_ids())`) + `stop_messages_admin_all` (FOR ALL `is_admin_caller()`). **There is NO member-INSERT policy** — with RLS on + no permissive INSERT policy, member inserts are denied by default. That IS the read-only enforcement.
- **Phase 1 upgrade = adding ONLY `stop_messages_member_insert` + an auto-hide trigger on stop_message_reports + a `hide_own_message(uuid)` self-delete RPC.** Every column those need already exists in 0029. Do NOT alter the 0029 tables for Phase 1.
- **Why:** Todd chose the spec's recommendation — open member chat is unproven demand + a permanent moderation burden for a 2-person farm; the read-only board captures ~80% of the value (gate codes, tent changes) at ~zero moderation cost.

**Where it lives:**
- Member: `src/pages/stop-notes.astro` (read-only, SSR via RLS-scoped client; multi-location members get an ARIA tab switcher; single-location = no switcher). Entry is a **dashboard Quick-Actions card** (shown only when ≥1 active share has a `pickup_location_id`), NOT a 5th bottom-nav tab (the member bottom nav stays at 4 — Hick's-Law cap from the spec). `/stop-notes` was added to middleware `PROTECTED_PREFIXES`.
- Admin: `src/pages/admin/stop-notes.astro` + `src/pages/api/admin/stop-notes.ts` (POST action=post|update|hide|unhide; CSRF + requireAdmin + Zod). The ONLY way notes are created in Phase 0. New 📍 nav tab in AdminShell (admin strip has no 4-5 cap). Staff voice → admin's first name as display name; Host voice → supplied host_name (host notes posted by staff on the host's behalf, spec §5.3a).
- Logic: `src/lib/stop-chat.ts` — `memberDisplayName()` (privacy ceiling: first name + last initial, never a full surname), role badge labels, ET timestamp. Unit-tested in `stop-chat.test.ts` (`npx tsx`, no vitest).

**Gotchas hit:**
- The in-card timestamp on the green-tinted note surface needs `--ts-text-secondary` (#475569), NOT `--ts-text-muted` (#64748b) — muted fails WCAG AA (~4.3:1) on the tint. Fixed properly, not baselined. (Same token trap as the two node-baselined nodes in [[csa-portal-color-tokens]].)
- E2E cross-stop isolation test seeds its OWN ephemeral stops + re-points the test member (the FIX-1 fixture clears their real pickup, so you can't lean on it). Helpers in `tests/e2e/supabase-fixtures.ts` (`seedStopNotesFixture`/`cleanupStopNotesFixture`); afterAll restores pickup. The cross-stop assertion (member sees stop A note, count 0 for stop B) is the end-to-end proof of the RLS read policy.
- Did NOT touch `account/pickup.astro`, the `change_pickup_location` RPC, or `PickupNudgeBanner.astro` — a separate home-delivery-gating change was coming for those (avoid the collision).
