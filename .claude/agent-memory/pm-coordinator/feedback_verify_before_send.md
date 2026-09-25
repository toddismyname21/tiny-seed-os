---
name: verify-before-send
description: Nothing goes out unless every fact in it was read from a source of truth in that same action. Todd's rule after a wrong phone number reached 68 emails.
metadata:
  type: feedback
---

**Nothing leaves the farm — email, invoice, PDF, text, portal copy — unless every fact
in it was READ FROM A SOURCE OF TRUTH in that same action.** Not recalled. Not carried
over from an earlier draft. Read.

**Why:** on 2026-08-27 I put a customer's personal cell into 68 outgoing emails as Todd's
number, including a 58-recipient wholesale blast and a driver's route instructions. The
correct number was in a contract I had already opened that hour. In the same session I
also told 65 chefs a blended price of $3.11 when the arithmetic gives $3.125, quoted a
product the catalog has marked inactive, and emailed a driver "you're on the road" when
the route status in the database said she had finished the day before. Every one of those
was cheap to check and none of them were checked.

Todd: *"If I wanted to mess up all of the time, I would just do it and not use the Claude
Code at all. You are supposed to make us better."* That is the standard. Being fast and
wrong is worse than not being here — a farm running on plausible-sounding numbers is
chaos, and the customer never knows which figures to trust.

**How to apply:**
- Before writing ANY of these into outgoing copy, go read it: phone numbers, prices,
  dates, quantities, totals, links, names, someone's schedule or status.
- "It was in the conversation earlier" is NOT a source. Re-read it.
- Prefer the system of record: the catalog for prices, `resolveCycle` for who gets what,
  the contract for wage and hours, `delivery_routes.status` for whether a route is live,
  `config/verified_facts.json` for phone numbers.
- Derive rather than assert. If a number can be computed, compute it in code and paste
  the result — do not do arithmetic in prose.
- Check availability flags too, not just the price (`is_active`).
- The gate in `send_email.py` catches phones and links only. It cannot catch a wrong
  price, a wrong date or a wrong claim about someone's day. Those stay on me.

**Corollary for RECORDS RECONSTRUCTION (Todd 2026-08-29): "Just because it was in the
plan does not mean it happened."** A plan, a crew instruction, or a published box list is
evidence of INTENT, not of occurrence. For compliance records, use the tier system:
Tier A = money/product moved (paid invoice, delivered order, market sale) → record it.
Tier B = operational trace (packed_at/delivered_at stamps, driver photos, worker texts
confirming completion) → record with source. Tier C = plans/instructions (weekly_box_plan,
crew work lists, planned dates in PLANNING_2026) → NEVER record alone; only as
corroboration for A/B, or flagged as unconfirmed. Better a gap you can explain than a
record you cannot defend.

Related: [[todd-phone]], [[email-send-discipline]], [[show-email-before-send]].
