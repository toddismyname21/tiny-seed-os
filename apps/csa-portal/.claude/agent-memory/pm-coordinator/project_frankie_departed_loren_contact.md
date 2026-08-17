---
name: frankie-departed-loren-contact
description: Frankie (tinyseedcsa@gmail.com) left the farm 2026-07; Loren (tinyseedfleurs@gmail.com) is now the default member-facing contact alongside Todd.
metadata:
  type: project
---

Frankie is no longer with Tiny Seed Farm (Todd, 2026-07-30). The default member-facing contact is now **Loren — tinyseedfleurs@gmail.com** (customers row: contact_name "Loren", role staff). Todd (todd@tinyseedfarmpgh.com) remains on everything.

**Why:** Staff departure. Member reply-to/contact lists that still included tinyseedcsa@gmail.com were routing member email to an unmonitored inbox (contributed to the Lee Ann Antol "emailed many times, no reply" incident — her emails never reached Todd).

**How to apply:**
- Never add tinyseedcsa@gmail.com to any reply-to, CC, mailto, or notification list. Use todd@ + tinyseedfleurs@gmail.com.
- Canonical constant: `apps/csa-portal/src/lib/contact.ts` (CSA_PRIMARY_EMAIL).
- Frankie's customers row (0ff47230-…) was demoted staff→member on 2026-07-30 (admin access revoked); row kept per [[proper-data-records]].
- `scripts/csa_inbox_triage.py` still targets the old tinyseedcsa inbox — legacy; who owns/monitors that Gmail account is UNRESOLVED (ask Todd before relying on it).
- Related: [[send-from-todd-gmail]] — personal correspondence still goes FROM Todd's Gmail.
