---
name: send-correspondence-from-todd-gmail
description: Outbound correspondence must be sent FROM todd@tinyseedfarmpgh.com (Gmail), not the Resend hello@ address — that's where recipients reply
metadata:
  type: feedback
---

Send outbound **correspondence** (customers, chefs, partners, orgs — anyone who replies) **FROM `todd@tinyseedfarmpgh.com`** via the Gmail API (OAuth token in `tinypm/.oauth_tokens/todd.json` — see [[gmail-read-access]]; the token has `gmail.send`). Do NOT send correspondence from the Resend `hello@tinyseedfarm.com` address.

**Why:** Todd directive 2026-06-29 — "make sure you are sending any correspondence from my todd@tinyseedfarmpgh.com. That is where they have to respond." Replies must land in Todd's inbox. (Confirmed by prior success: the 49-chef wholesale blast, the Amy Hepner reply, and the Marc Rattay/PASS email all went from todd@ via Gmail.)

**How to apply:**
- 1:1 and partner/org emails → Gmail send-as todd@ (thread into existing conversations with In-Reply-To + threadId when one exists).
- This OVERRIDES defaulting to Resend `hello@`. [[mac-email-sending]] (Resend script) is still fine for sending *internal* PDFs/docs TO Todd himself, but anything a third party will reply to goes from todd@.
- Mass member blasts: if Resend must be used for volume, at minimum set reply_to to include todd@tinyseedfarmpgh.com.
