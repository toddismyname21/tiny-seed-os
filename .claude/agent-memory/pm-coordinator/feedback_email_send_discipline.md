---
name: email-send-discipline
description: NEVER send wide/broad emails — every send must be scoped to a VERIFIED share audience, content must match that audience, and the audience is previewed + confirmed before sending. Hard rule.
metadata:
  type: feedback
---

**NEVER send an email to "all active members" or any broad/unverified audience. Every send must target ONLY the specific people who hold the share the email is about — verified against their actual share — and the content must apply to that exact audience.**

**Why:** 2026-06-08 I sent the summer-CSA "this week's box" email to ALL 197 active members. **66 of them had no summer share** (21 flower-only, 13 spring-only, 24 flex-only, 8 mixed) — including Rhonda McNally, who emailed back confused, saying she never signed up for the summer CSA. It was an obvious, avoidable mistake that damaged trust and rightly angered Todd. His words: "Why are you sending emails out wide when they should be going to specific individuals? Why are you sending anything to anyone without specific confirmation and verification of the share?"

**How to apply — every single send, no exceptions:**
1. **Declare the exact audience by verified share type** BEFORE composing. Box/season content → ONLY that season's veg members (e.g. `summer_veg`). Flex content → `flex`. Flower content → `flower`. Never "everyone."
2. **Content must match the audience.** A summer-box email may ONLY go to summer-box holders. If part of the message (e.g. a new pickup location) applies more broadly, that's a SEPARATE, smaller, audience-appropriate send — not a reason to widen the box email.
3. **Preview the audience before sending** — count + breakdown by share type + a sample. If the breakdown contains a share type the content doesn't apply to, STOP.
4. **Use the enforced tool:** `apps/csa-portal/scripts/send_member_campaign.py` requires `--shares`, refuses content/audience mismatches, dry-runs by default, and prints the breakdown. Don't hand-roll "send to all" loops. Protocol: `docs/CSA_EMAIL_SEND_PROTOCOL.md`.
5. **When unsure, send to FEWER (or none) and confirm with Todd first.** A missed email is recoverable; a wrong-audience blast is not. This applies doubly to anything involving charges, shares, or money — verify the share AND paid status (Shopify = truth) before sending. Related: [[customer-comms-voice]], [[mac-email-sending]].
6. **CONFIRM CONTENT before sending — never fill an unstated detail with an assumption, even on a quick single-recipient send.** 2026-06-16: Todd said "send Mayfly an email that we can do 4oz clamshells and 12oz." I *assumed* the product was edible flowers/nasturtiums and sent it — he meant **King Spring Mix** (4 oz clamshells / 12 oz "big bagz"). Wrong email went out because I guessed a detail he hadn't specified. His rule: "confirm before you send with assumptions." If ANY content specific (product, price, size, date) is inferred rather than stated, draft it and get a yes first. A one-recipient explicit "send X" is NOT license to invent the parts of X you don't know.
