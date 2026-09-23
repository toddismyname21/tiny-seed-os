---
name: aig-002-pending-send
description: AIG reimbursement 002 (Tilmor, $17,497.56) is built and approved in principle — waiting ONLY on the Tilmor receipt for order 12391675, then Todd says send
metadata:
  type: project
---

**State as of 2026-09-23.** Everything for AIG reimbursement 002 is finished and
Todd has reviewed it on his phone. Todd: *"I'll wait for the finalized receipt
and then we can send it all."*

**Packet:** `legal/grants/ag_innovation_2026/round1_C940002366/reimbursements/002_DRAFT_tilmor/`
— filled form (Roth's own template), phone preview PDF, dibbler one-pager,
drafted email, and seven source documents.

## The one blocker

Tilmor **order 12391675, $8,534.10**, placed 2026-09-23 15:22 UTC. Todd confirms
it is paid, but there is no receipt document anywhere — not in Gmail, not in
QuickBooks, not in the grant portal. Attachment 2 requires proof of payment.

**Tilmor bills when the order is FINALIZED, not when it is placed**, so the
Stripe receipt lags 1–2 days:

| Order | Placed | Receipt arrived |
|---|---|---|
| 12381680 | 4/15 18:57 | 4/17 19:10 — 2 days |
| 12388904 | 5/26 13:49 | 5/27 14:15 — 21 hours |

Watch Gmail for `from:receipts@tilmor.com` subject "Your Tilmor receipt [#…]".
The order page itself renders client-side, so curl cannot scrape the invoice —
the six portal PDFs were printed from a logged-in browser session.

## When the receipt lands

1. File it in packet 002 `source_documents/` and in the grant portal.
2. Send `DRAFT_EMAIL_TO_ROTH.md` to michroth@pa.gov with
   `DIBBLER_COVERAGE_QUESTION.pdf` attached. **Todd has pre-approved the send
   contingent on the receipt** — but SHOW HIM the final wording once more,
   because the email is dated and references "seven orders."
3. The invoice .docx goes in a SECOND email, after Roth rules on the dibbler.

## If Roth says the dibbler is not covered

Pull only that line. $17,497.56 → **$16,621.56**. Nothing else changes.

Related: [[aig-grants-status]]
