-- 0091_role_realignment.sql
--
-- Right-size who holds admin-equivalent access.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- `staff` is not a reduced role. resolveAdminRole() (src/lib/admin.ts) accepts
-- admin OR staff and nothing anywhere restricts staff relative to admin:
--
--     if (data.role !== 'admin' && data.role !== 'staff') return null;
--
-- 71 API routes under /api/admin are gated on requireAdmin, and every one of
-- them passes for staff. Only 10 use requireCrew. So in practice `staff` means
-- "second owner": member PII, QuickBooks and invoicing, pricing and the
-- wholesale catalog, campaign sending to the whole member list, and exports.
--
-- Measured 2026-08-17: SEVEN accounts held that access — Todd (admin) plus SIX
-- staff (Loren, Marigrace, Ben, Amelia, Sam, Jackson) — and ZERO accounts held
-- the `crew` role that migration 0068 created for exactly this purpose. The
-- field/harvest manager could open the books; a departed contractor still had a
-- live login.
--
-- Todd's decision 2026-08-17: "Loren, Ben, Amelia and myself are the only staff,
-- the rest are crew."
--
-- ── WHAT `crew` STILL GETS ───────────────────────────────────────────────────
-- Everything the pack floor actually touches — handoff, cooler, pick-pack —
-- and nothing else. Enforced in TWO places, not one: the middleware allowlist
-- (CREW_ALLOWED_PREFIXES) and, as the real backstop, RLS via is_ops_caller(),
-- which only clears the three PII-free ops tables. A crew cookie cannot read a
-- member row even if a UI bug exposed a link.
--
-- This is what makes it safe to give the seasonal pack crew a login at all.
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- Demote by EMAIL, explicitly, one row at a time. No "UPDATE ... WHERE role =
-- 'staff' AND email NOT IN (...)" — a blanket predicate would sweep up any staff
-- account added between writing this and running it, silently. Naming each row
-- means the migration does exactly what its author read and nothing more.
--
-- Members are untouched: every statement is scoped to role = 'staff', so a
-- customer who happens to share an address can never be caught by this.
--
-- NOT DONE HERE: Sam (skpollac@gmail.com) is off the farm and her MacBook
-- retires 2026-08-23. Demoting her to crew is strictly safer than leaving her
-- as staff, so it happens now, but the correct end state is REMOVAL. Deleting an
-- account is not a thing to bury inside a role migration — it needs Todd's
-- explicit call, and it is tracked separately alongside revoking her SSH key.
--
-- Idempotent: safe to re-run.

BEGIN;

-- Marigrace — market/orders help, no need for books or member PII.
UPDATE customers SET role = 'crew'
WHERE lower(email) = 'marigrace0707@gmail.com' AND role = 'staff';

-- Jackson Schulman — pack floor.
UPDATE customers SET role = 'crew'
WHERE lower(email) = 'schulmanjackson@gmail.com' AND role = 'staff';

-- Sam — off the farm; machine retires 2026-08-23. Interim step only; the
-- intended end state is removal (see note above).
UPDATE customers SET role = 'crew'
WHERE lower(email) = 'skpollac@gmail.com' AND role = 'staff';

-- Loren (member-facing contact), Ben (harvest manager), Amelia stay STAFF.
-- Todd stays ADMIN. Asserted, not assumed — fail loudly rather than leave the
-- farm with nobody who can run it.
DO $$
DECLARE staff_n int; admin_n int;
BEGIN
  SELECT count(*) INTO staff_n FROM customers WHERE role = 'staff';
  SELECT count(*) INTO admin_n FROM customers WHERE role = 'admin';
  IF admin_n < 1 THEN
    RAISE EXCEPTION 'refusing to leave zero admins';
  END IF;
  IF staff_n <> 3 THEN
    RAISE WARNING 'expected 3 staff (Loren, Ben, Amelia), found %', staff_n;
  END IF;
END $$;

COMMIT;
