---
name: email-bcc-todd
description: EVERY outgoing member/host email must BCC todd@tinyseedfarmpgh.com — Todd wants copies of exactly what people are told. Add "bcc" to every Resend payload.
metadata:
  type: feedback
---

**Every email sent on the farm's behalf (members, hosts, drivers, anyone) must BCC `todd@tinyseedfarmpgh.com`.**

**Why:** Todd, 2026-06-12: "I would like to get copies of any emails you send out, so I know exactly what people are being told." During week-1 CSA ops I sent dozens of member emails (replies, campaigns, incident notices) that Todd only saw summarized in chat. He wants the actual sent copy in his inbox.

**How to apply:** Add `"bcc": ["todd@tinyseedfarmpgh.com"]` to every Resend API payload — ad-hoc sends, `scripts/send_member_campaign.py`, `scripts/send_signin_phone.py`, and any portal code paths I add (e.g. flex order confirmation). For bulk campaigns (50+ recipients) a BCC on every message floods his inbox — instead BCC him on the FIRST message of the batch and tell him the audience count + that all bodies are identical (or ask his preference). Quote significant email bodies in chat too, but the BCC is the guarantee. Related: [[email-send-discipline]] (audience verification before sending).
