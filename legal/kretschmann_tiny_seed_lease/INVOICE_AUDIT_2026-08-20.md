# Kretschmann Invoice Arithmetic Audit — 2026-08-20

Todd's concern: *"He has been prone to errors and I am concerned he has made
arithmetic errors in the past."* Every invoice on file was extracted and its line
items re-added against its stated TOTAL. Re-runnable: `python3 audit_invoices.py`
from the `invoices/` directory.

**Scope:** 37 `.doc` invoices on file (104788 → 104836, Dec 2024 → Dec 2025), plus
the 6 paper invoices from July/August 2026 (104855–104860) transcribed from photos.

---

## RESULT — 3 real arithmetic errors, all in Don's favour

| Invoice | Date | Lines sum to | Stated TOTAL | Error | Paid? |
|---|---|---|---|---|---|
| **104808** | 2025-07-01 | $935.00 | $965.00 | **+$30.00** | file marked `pd` = PAID |
| **104827** | 2025-10-01 | $846.48 | $1,021.98 | **+$175.50** | file marked `pd` = PAID |
| **104859** | 2026-08-01 | $1,415.08 | $1,515.08 | **+$100.00** | unpaid — catch it now |
| | | | **TOTAL** | **$305.50** | |

**$205.50 of that was already paid.** Only the $100 on 104859 is still catchable.

### 104808 — $30.00 (2025-07-01, trucks)
```
2005 Ford 250 Truck  @1     7/1 YTD 310      310.00
Isuzu 2003 Truck     @1.25  7/1 YTD ??500    625.00
                            TOTAL            965.00
```
310.00 + 625.00 = **935.00**. Stated 965.00. Both line calculations are internally
correct (310 × 1, 500 × 1.25), so the lines are right and the total is wrong.
Note Don's own "??500" — he was unsure of the Isuzu mileage.

### 104827 — $175.50 (2025-10-01, misc + fuel)
```
20%  Propane   (427Dec24)          85.40
20%  Gasoline  (80%419Dec24)       67.04
20%  Diesel    (60%724Dec24)       89.04
7    Apples Prima  @40            280.00
6.5  Apples Liberty @50           325.00
                     TOTAL   $  1021.98
```
Sum = **846.48**. Stated 1,021.98. **No sixth line exists** — the raw document was
read directly to rule out a line the parser missed.

### 104859 — $100.00 (2026-08-01) — NOT YET PAID
Covered in the running ledger. Separately, electric was raised $150 → $200 on this
same invoice with no notice.

---

## Checked and CORRECT (not errors)

Three invoices the automated pass flagged are false positives — recorded so nobody
re-raises them:

- **104788** (2024-12-04) — parser counted the `BALANCE` line as an item.
  Lines total $7,390.48 = stated TOTAL ✓. Balance $5,890.48 = $7,390.48 − $1,500
  payment ✓. **Correct.**
- **104794** (2025-03-01) — parser counted the `PAID 3/6/25 -3,000.00` payment as an
  item. $2,000 + $1,000 = $3,000 = TOTAL ✓. **Correct.**
- **104805** (2025-06-01) — off by $1.25, but the file is named `void` and 104808
  states "(Ignore Inv. #104805)". **Superseded, not live.**

The remaining 31 invoices reconcile to the cent.

---

## What this means

Don's arithmetic is right **34 times out of 37** — this is carelessness, not a
pattern of inflation. But it runs one direction: **all three errors favour him**, and
two were paid without challenge.

Combined with the June credits vanishing from the August summary, the lesson is the
same one the 2026 arrears dispute taught: **check the total against the lines every
time, before writing the cheque.** That is now a 10-second job with `audit_invoices.py`.

## Open questions for Don
1. **104808** — $30 overpaid, July 2025.
2. **104827** — $175.50 overpaid, October 2025.
3. **104859** — $100 correction before payment.
4. **Electric** $150 → $200, unannounced.
5. **104858** — the line detail has never been seen, only a summary line.
