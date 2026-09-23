# PA Agriculture Innovation Grant — Tiny Seed Farm LLC

Two separate grants live here. They have different application IDs, different
contracts, and different money. Do not mix them.

| | Round 1 | Round 2 |
|---|---|---|
| Folder | `round1_C940002366/` | `round2_202604189681/` |
| Application ID | 202411157573 | 202604189681 |
| Contract | **C940002366 — EXECUTED** | not yet issued |
| Award | $75,000 | $31,380 (of a $46,703 ask) |
| Match required | $37,500 | ~$23,003 as applied for |
| Receipts needed | $112,500 total | — |
| Performance period | 07/01/2024 – 06/30/2027 | — |
| Status | **Reimbursing.** #001 paid. | **Awaiting Attachment 1.** |

**PDA contact:** Michael Roth, Director of Conservation and Innovation —
michroth@pa.gov · 717-210-1217 · 2301 N Cameron St, Harrisburg PA 17110
**Vendor number:** 833615

## How reimbursement actually works (learned from invoice 001)

1. Buy an item that falls under an approved budget line. Keep the vendor
   invoice AND the proof of payment — Attachment 2 requires both.
2. Fill **Roth's template** (`round1_C940002366/02_pda_templates/`). Only the
   yellow cells. Leave "Amount to Reimburse" blank — PDA computes it.
3. Email it to Roth with the backup documents attached.
4. PDA reimburses **two-thirds of receipts submitted** — $75,000 of $112,500.
   Invoice 001 submitted $41,464.28 of receipts and paid $27,642.86, which is
   exactly 66.67%. Budget for that ratio; it is not dollar-for-dollar.
5. Expect roughly 6–10 weeks end to end. Invoice 001: submitted 7/6, Roth
   forwarded it 8/20 after three nudges, PDA received it 8/24, ACH 9/16.

## Folder map

```
round1_C940002366/
  00_contract/          the executed agreement — the approved budget is p.16–18
  01_application/       what was applied for
  02_pda_templates/     Roth's blank reimbursement template
  03_correspondence/    email threads with PDA
  reimbursements/
    001_..._SUBMITTED_PAID/   invoice, receipts, and the PDA remittance advice
    002_DRAFT_tilmor/         the next one, in progress
  LEDGER.md             running totals — read this before submitting anything
round2_202604189681/
_archive_working_docs/  drafting notes from the R2 application. Not authoritative.
```

## The grant portal is the document vault — check it FIRST

`apps/grant-portal` → **grant-portal-ashy.vercel.app** (password `tinyseed2026`),
backed by its own Supabase project `tiny-seed-grants` (ref `xkiplnkamcjjuzwpsqvf`,
free tier — it auto-pauses, resume it in the dashboard if DNS fails).

It holds `grants`, `grant_budget_lines`, `expenses`, `deadlines`,
`grant_deliverables`, `documents` (files in the private `documents` bucket),
`reimbursements`, plus the FSA loan and its payoff proofs.

**It already had all six older Tilmor invoices** when email and QuickBooks each
had only part of the picture. Search it before concluding a document is missing.

## A third grant lives here too

**Farm Vitality Planning Grant — C940002569, $14,250**, contact Neil Imes
(nimes@pa.gov, 717-787-5539), application 202603138391. Reimburses **75% at
completion, one time**, match 25% cash with **no in-kind allowed**. Service
provider: Good Roots. Target completion ~June 2027.

Logged spend so far is all Trellis Legal: $600 (6/22) + $700 (8/4) cash, plus a
$500 in-kind market-credit barter that **probably does not qualify** given the
no-in-kind rule. Confirm with Imes before counting it.
