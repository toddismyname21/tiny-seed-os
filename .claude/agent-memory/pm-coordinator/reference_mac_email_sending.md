---
name: mac-email-sending
description: WORKING email send — Resend via scripts/send_email.py (key in gitignored .env); MUST set browser User-Agent (Cloudflare 1010); Mail.app osascript does NOT send
metadata:
  type: reference
---

**TO SEND EMAIL (verified working 2026-06-08):** use `apps/csa-portal/scripts/send_email.py`:
```
python3 scripts/send_email.py --to X --subject "S" --text "..." [--attach f1.pdf f2.pdf]
```
It reads `RESEND_API_KEY` + `RESEND_FROM_EMAIL` from `apps/csa-portal/.env` (gitignored — safe). Prints the Resend message `id` on success = proof of delivery. Verified: sent Pick/Pack PDFs to todd@tinyseedfarmpgh.com, HTTP 200, real id returned.

**Config (stored in gitignored `apps/csa-portal/.env`):** `RESEND_API_KEY` (Todd provided 2026-06-08) + `RESEND_FROM_EMAIL=Tiny Seed Farm <hello@tinyseedfarm.com>`. Verified Resend sender domain = **tinyseedfarm.com** (`hello@` / `system@`). Todd can rotate/delete the key in the Resend dashboard anytime.

**CRITICAL GOTCHA:** Resend API is behind Cloudflare — a default `python-urllib` User-Agent gets **HTTP 403 "error code: 1010"** (Cloudflare bot-block). The script sets a **browser User-Agent** to get through. Any new HTTP-to-Resend code must do the same.

**DEAD END — do NOT use:** Mail.app via osascript. `send` returns "SENT" with no error but the message lands in **Drafts** (no working send account); it does NOT deliver. I falsely told Todd the lists were "sent" this way once — they weren't.

**RULE: never claim an email sent without proof** (Resend message `id`, or check the Sent mailbox).

**Team visibility (Todd 2026-06-08):** all sends now set `reply_to` = the 3 team addresses **tinyseedcsa@gmail.com · todd@tinyseedfarmpgh.com · tinyseedfleurs@gmail.com** so customer replies reach all three. (Wired into `send_email.py` + `send_all_member_emails.py`.) Todd also wants **hello@tinyseedfarm.com forwarded to all 3** — set up as a Google Workspace Group (tinyseedfarm.com email = Google Workspace, MX → google) with the 3 as members; Todd must do this in admin.google.com (I have no Google Admin access). OPEN: whether the team wants a COPY of every outbound send (BCC-every = inbox flood for big campaigns, vs one copy per campaign) — pending Todd's choice. 

**Channel guide:** ad-hoc files to Todd → this script. Member blasts (flex segment / all members / weekly box) → deployed portal campaign/Resend (proper unsubscribe), targeted by share_type. Custom member lists (the 89 non-logged-in, Allison Park) → this script with a generated recipient list, or builder adds CSV-upload to the campaign tool. See [[project_csa_flex_ordering_build]].
