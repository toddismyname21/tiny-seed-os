---
name: qb-billpay-planned
description: Vendor bill-pay = Melio (chosen over QB Bill Pay 2026-08-07); Claude enters bills in QB via API, Todd approves payments in Melio
metadata:
  type: project
---

Vendor payments run through **Melio** (Todd chose it 2026-08-07, superseding the earlier QB Bill Pay plan).

**Why:** Free ACH, native 2-way QBO sync, approve-only workflow — Todd never enters invoices, just approves payments. QB Bill Pay has no third-party API; Melio's QBO sync makes that moot.

**How to apply:**
- Pipeline: vendor invoice (email/photo) → Claude creates Bill in QB via API (pipe VERIFIED in production 2026-08-07: $0.01 bill created+deleted, realm 193514705221064) → Melio syncs it in → Todd approves → free ACH out → payment syncs back to QB.
- Todd's one-time setup (verify done before relying on it): melio.com signup w/ todd@tinyseedfarmpgh.com, EIN 81-5299411, connect QBO company, link farm checking.
- QB `com.intuit.quickbooks.accounting` scope covers Bill/BillPayment — no OAuth scope change needed. Payroll runs + actual money movement have NO third-party API (Intuit/Melio UI only) — don't promise API automation there.
- Related: farm TIME_CLOCK → QB TimeActivity sync for payroll prep (first for the two H-2A Juan Pablos: $15/hr, bi-weekly, unpaid 30-min lunch daily per contract + Todd 2026-08-07). Related: [[qb-integration-live]].
