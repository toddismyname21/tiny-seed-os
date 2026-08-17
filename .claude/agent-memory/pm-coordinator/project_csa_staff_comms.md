---
name: csa-staff-comms
description: CSA portal staff access + customer-communication setup — Frankie as staff admin, member contact routed to both Frankie+Todd, per-member comms log. Plus the tinyseedcsa@ shares wrinkle.
metadata:
  type: project
---

Frankie manages CSA customer communication (Todd, 2026-05-24).

**Access model:** the portal supports roles `member | admin | staff` (customers.role). Middleware gates `/admin/*` to admin+staff; RLS `is_admin_caller()` ALSO covers staff — so staff get admin pages AND data (verified). Todd = admin; **Frankie = staff** at `tinyseedcsa@gmail.com` (logs in via /login → lands on /admin). To add more staff: set `customers.role='staff'` for their email.

**Customer contact routing (built 2026-05-24):** every member-facing "Contact the farm" path emails BOTH `tinyseedcsa@gmail.com` (Frankie) AND `todd@tinyseedfarmpgh.com` — so nothing slips through. Shared constant `CSA_CONTACT_EMAILS` in `src/lib/contact.ts`; wired in ContactFarm, login, DeliveryTracker. RECOMMENDED belt-and-suspenders (Todd to do): set tinyseedcsa@ Gmail to forward to todd@ so even single-address sends reach both.

**Per-member communication log (built 2026-05-24):** `member_comms` table {customer_id, author_email, channel (email/phone/text/note/other), summary, created_at}, RLS admin+staff. UI on `/admin/members/[id]` — log + view every interaction. Purpose: nothing falls through the cracks.

**⚠️ Open wrinkle:** `tinyseedcsa@gmail.com` already had 2 active PAID CSA shares (Summer Veg Large $360 order 6252432162969 + Flower Large $200 order 6243775381657, originally named "Todd Wilson"). So Frankie's staff comms login also "owns" $560 of shares. Todd hasn't decided whether to MOVE those to his personal account (todd@tinyseedfarmpgh.com) for clean identity — left as-is pending his call. Related: [[csa-portal-feature-backlog]], [[csa-household-access]].
