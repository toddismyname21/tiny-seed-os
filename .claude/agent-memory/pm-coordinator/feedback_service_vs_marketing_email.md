---
name: service-vs-marketing-email
description: Portal/membership/service announcements go to ALL active share-holders regardless of Shopify marketing opt-out. Only the weekly recipe NEWSLETTER respects newsletter_opt_in. CAN-SPAM transactional exemption.
metadata:
  type: feedback
---

For CSA email campaigns, distinguish **service/transactional** from **marketing**:

- **Service / membership announcements** (portal launch, "your box is delayed," pickup changes, vacation confirmations, payment info, anything about their EXISTING PAID membership) → send to ALL active share-holders, **ignore `newsletter_opt_in` / Shopify marketing consent.** These are legally transactional (CAN-SPAM exemption) — a paying member is entitled to operational info about what they bought.
- **Marketing / newsletter** (the weekly box+recipe email, promotions, "buy a flower share too") → MUST respect `newsletter_opt_in`.

**Why:** Todd's directive 2026-06-04 during the portal launch: "The folks that opted out, just include them if they have a share. It is not the shopify marketing and I need to get information to them. They can opt out." Excluding paying members from membership info because they unsubscribed from the *newsletter* was wrong — they still need to know how to access what they paid for.

**How to apply:** The campaign composer's "Only newsletter opted-in" toggle should be OFF for service announcements, ON for marketing. When sending a portal/membership/service campaign, send to every active share-holder. The 7 opted-out share-holders on 2026-06-04 (Elizabeth Sapp, Mollie Rosenzweig, Gerard Maloney, Jen VanderPlaats, Dave DeSimone, Shay Park, Gwendolyn Jarvis) still got the launch info.

**Build implication:** the campaign tool should label the toggle clearly — e.g. "Service announcement (send to all members)" vs "Marketing (opted-in only)" — so this distinction is obvious and the default is correct per campaign type. Related: [[customer-comms-voice]].
