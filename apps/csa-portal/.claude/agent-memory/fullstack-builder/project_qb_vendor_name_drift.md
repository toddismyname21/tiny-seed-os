---
name: qb-vendor-name-drift
description: QuickBooks vendor DisplayNames drift by punctuation/legal-suffix vs how emails name the same vendor — dedup MUST normalize tokens
metadata:
  type: project
---

QuickBooks vendor `DisplayName` values do NOT match the vendor name that appears in incoming invoice emails / QB notification emails.

**Concrete cases (realm 193514705221064):**
- QB vendor 287 is `Goat Rodeo Farm & Dairy LLC` (no comma), but the QuickBooks-notification email names it `Goat Rodeo Farm & Dairy, LLC` (with comma).
- QB vendor 469 is `Redhawk Coffee`, but the invoice says `Redhawk Coffee Roasters`.

**Why:** A naive `where DisplayName like '%<full email name>%'` fuzzy match FAILS on this drift → the dedup finds no existing bills → it creates a NEW duplicate vendor + a duplicate Bill. This actually happened during the vendor-bills build: 5 duplicate bills + 3 duplicate vendors were created before the fix (all cleaned up).

**How to apply:** Any QB vendor/customer dedup must normalize to significant word tokens — strip punctuation and legal suffixes (LLC/Inc/Co/Ltd/…) — then match on leading tokens or bidirectional token-subset containment, NOT a substring `like` on the raw name. This is what `findVendorsByNameLike` in `apps/csa-portal/src/lib/quickbooks.ts` does. QB has no subqueries and no `like` on numeric/date columns, so pull a vendor's bills by VendorRef Id and filter amounts/dates in JS. See [[vercel-cron-imap-timeout]] for the cron this lives in.
