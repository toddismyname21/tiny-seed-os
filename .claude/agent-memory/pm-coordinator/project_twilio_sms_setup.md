---
name: twilio-sms-setup
description: Twilio SMS state 2026-07-05 — brand APPROVED, campaign resubmitted IN_PROGRESS after fixing the 30909 CTA rejection; what to check next session and how sends must be configured.
metadata:
  type: project
---

Twilio SMS setup state (2026-07-05). "Twilio never worked" is now root-caused and mostly FIXED.

**Why:** it was blocked by carrier compliance, not code:
1. `.env.csa` TWILIO_PHONE_NUMBER had a TYPO (+1877**319**5491; account owns +1877**318**5491) — fixed → now `+14128662259`.
2. Toll-free 877 number: verification **TWILIO_REJECTED** (entity misclassification/missing business docs) — removed from the messaging pool; don't use unless Todd re-verifies with EIN docs.
3. Local 412 number: past sends failed 30034 (no A2P campaign). **Brand = APPROVED (STANDARD)**; the LOW_VOLUME campaign was **FAILED w/ error 30909** — reviewers couldn't verify the opt-in CTA because the message_flow URL was login-gated (old portal csa.html).

**Fix applied:** built PUBLIC disclosure page `https://csa.tinyseedfarm.com/sms-policy` (TCPA program terms, unchecked-checkbox opt-in description, STOP/HELP, frequency, rates) and RESUBMITTED the campaign referencing it. Messaging service `MG373c3dad007b02072df6e67441a71ed0` (pool now = only +14128662259).

**2nd rejection (2026-07-06):** 30908 (privacy policy unverifiable — the link went to Shopify's policy which lacks SMS clauses) + 30882 (no T&C). Fix: expanded /sms-policy with `#privacy` (the required "no mobile information shared with third parties/affiliates for marketing" + opt-in-data-never-sold clauses) and `#terms` (program/frequency/rates/STOP-confirmation/HELP/eligibility/consent-not-condition-of-purchase) sections, then deleted + resubmitted (3rd submission) with those anchor URLs explicit in MessageFlow. Status: **IN_PROGRESS** again. The 30909 CTA issue did NOT recur — the public-page approach works; each rejection has been a different, narrower issue.

**How to apply:** check campaign status at session start while pending: GET `https://messaging.twilio.com/v1/Services/MG373c3dad007b02072df6e67441a71ed0/Compliance/Usa2p` (basic auth from .env.csa). When `VERIFIED`: send test SMS to Todd (need his cell), then wire pickup-reminder sends — always send via `MessagingServiceSid=MG373c3dad…` (not a raw From number). Keyword params (OptInKeywords etc.) must be REPEATED form params, not comma-joined.

**Why (money):** account balance was $15.40; campaign vetting fee (~$15 one-time) + ~$2-3/mo campaign fee draws it near zero — Todd should top up / enable auto-recharge before real sends.

Related: [[csa-portal-prod-deploy]]. Supersedes the "Twilio never worked / needs full setup walkthrough" note in project_schedule_triggers_pending.
