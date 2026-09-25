---
name: confirm-texts-before-send
description: Texts need Todd's confirmation of BOTH the wording and the recipient identity — same gate as email, now that sending actually works.
metadata:
  type: feedback
---

# Confirm the person AND the wording before sending any text

Todd, 2026-08-31: *"before you send a text, make sure I confirm and it is sent
to the CORRECT PERSON."*

**Why:** this arrived the moment texting became real — see
[[imessage-send-read]]. Sending from his own number into an existing thread is
higher-trust than email, so a wrong recipient is worse, not better: it lands in
a conversation with someone who knows him. It is the same rule as
`.claude/rules/verify-before-send.md`, extended to SMS.

**How to apply:**
- Show **who** (name, number, and the source the number was verified from) and
  **what** (the exact body), then stop.
- Verify identity from `config/verified_facts.json` first, then
  `wholesale_account_contacts`. Corroborate with an existing thread in chat.db
  when one exists.
- "Text Sherri and tell her X" is the task, NOT approval of the copy. Wait for
  an explicit send.
- Same standing rule as email: urgency is not approval. Todd said *"we need to
  send the list"* on 2026-08-31 and I read it as sign-off; two emails went to
  Center for Hope unapproved, one offering produce the farm did not have.

**Tone:** Todd's own writing is warm and direct. He flagged mine as having gone
*"kurt and impersonal"* — bulleted, clipped, efficient-sounding. Write the way
he talks. With people he is friendly with (Sherri at Black Radish), casual is
correct — "Hey Sherri! Heads up…", "Lmk what sounds good".
