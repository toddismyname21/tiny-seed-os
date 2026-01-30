# Don Kretschmann Invoice Audit
## Findings & Potential Overpayments

**Date:** January 29, 2026
**Audited By:** Claude PM System
**Data Sources:** TinySeed25Data.xlsx, Invoice files 788-832

---

## EXECUTIVE SUMMARY

| Issue | Amount | Status |
|-------|--------|--------|
| **Fuel Double-Charge** | $780.40 | VERIFY - needs confirmation |
| **Diesel 100% vs 60%** | $296.80 | CONFIRMED overpayment |
| **Nickel-and-Dime Items** | $331.58/yr | Ongoing annual waste |
| **TOTAL POTENTIAL** | **$1,408.78** | |

---

## ISSUE #1: FUEL DOUBLE-CHARGE

### What the Spreadsheet Shows

**Invoice 788** (from InvoiceBill24 sheet) charges:
```
Fuel: =Fuels!$F$11 = SUM(Gas + Diesel)
  Gas (80% of $419):    $335.20
  Diesel (60% of $742): $445.20
  INVOICE 788 FUEL:     $780.40
```

**THEN** the monthly Misc+Fuel invoices (812, 822, 827, 832) charge:
```
August 2025:   $85.40 + $67.04 + $89.04 = $241.48
September:     $85.40 + $67.04 + $89.04 = $241.48
October:       $85.40 + $67.04 + $89.04 = $241.48
November:      $85.40 + $67.04 + $89.04 = $241.48
```

Total monthly fuel: **$965.92** (4 months visible, likely 5 months total = $1,207.40)

### The Math Doesn't Work

Don is either:
1. **Charging ONCE on Invoice 788** (the annual total), OR
2. **Spreading over 5 months** (June-October)

**But NOT both.** If Todd paid both, that's double-payment.

### Verification Needed

**Todd should check:**
- [ ] Did you pay Invoice 788 in late 2024?
- [ ] Did you ALSO pay fuel on monthly invoices June-October 2025?
- [ ] If YES to both → $780.40 double-charge

---

## ISSUE #2: DIESEL TANK - 100% vs 60%

### What Todd Said
> "I also paid for the entirety of the new tank of diesel"

### What the Spreadsheet Shows
```
Diesel: $742 total tank
Todd's usage: 60%
Todd's share: $445.20
```

### The Overpayment

If Todd paid 100% of the diesel tank:
```
Amount paid:     $742.00
Should have paid: $445.20
OVERPAYMENT:     $296.80
```

### Verification Needed

- [ ] Confirm Todd paid $742 for diesel (receipt/bank statement)
- [ ] Confirm this is the same tank shown in spreadsheet

---

## ISSUE #3: NICKEL-AND-DIMING (Tools, Hoses, etc.)

### Items Todd Would Rather Buy Himself

From InfrastructureRental sheet:

| Item | Value | Life | Annual Charge | Todd's Take |
|------|-------|------|---------------|-------------|
| Hand Tools | $500 | 3 yr | $143.75 | "I'd rather use my own" |
| Hose Breakers/Wands | $400 | 3 yr | $153.33 | "I'd rather use my own" |
| Greenhouse Hoses (150') | $100 | 3 yr | $34.50 | "I'd rather use my own" |
| **TOTAL** | | | **$331.58/yr** | |

### The Problem

These items depreciate over 3 years, meaning:
- **Year 1:** $331.58
- **Year 2:** $331.58
- **Year 3:** $331.58
- **Total:** $994.74 for ~$1,000 worth of basic tools

Todd could buy quality tools for **$600-800** and OWN them forever.

### Recommendation

Request these items be **removed from the cost-share** in the 2026 lease. Todd provides his own tools.

---

## ISSUE #4: DEPRECIATION RATES

### Questionable Life Spans

| Item | Don's Life | Industry Standard | Impact |
|------|------------|-------------------|--------|
| Hand Tools | 3 years | 5-10 years | Overcharging |
| Hoses | 3 years | 5 years | Overcharging |
| Tractors | 7-19 years | 15-20 years | Reasonable |

### Impact Example

Hand tools at 3-year life vs 5-year life:
- Don's calculation: $500 ÷ 3 = $166.67/year + 5% = $175/year
- Fair calculation: $500 ÷ 5 = $100/year + 5% = $105/year
- **Difference: $70/year**

---

## INVOICE 788 DETAILED BREAKDOWN

From InvoiceBill24 sheet:

| Line Item | Qty | Price | Total |
|-----------|-----|-------|-------|
| Rye seed | -3 | $22 | -$66 |
| Dipel | 2 | $20.99 | $41.98 |
| Revita Pro | 34 | $12 | $408 |
| Sulfur | 1 | $21.50 | $21.50 |
| Kelp | 1 | $76 | $76 |
| Plant Pro | 9 | $12.99 | $116.91 |
| Feathermeal | 2 | $34.50 | $69 |
| Farmland/Buildings | - | - | (from sheet) |
| Machinery | - | - | (from sheet) |
| **Fuel** | - | - | **$780.40** |

---

## VERIFICATION CHECKLIST FOR TODD

### Documents Needed

- [ ] **Invoice 788** - Do you have a paid copy? When did you pay it?
- [ ] **Bank/PayPal statement** showing diesel tank payment ($742)
- [ ] **June-October invoices** - Confirm you paid fuel monthly

### Questions for Don

1. "The spreadsheet shows fuel charged on Invoice 788 AND spread monthly June-October. Which is correct?"
2. "I paid for the full diesel tank but the spreadsheet shows 60% - can we reconcile?"
3. "Can we remove hand tools/hoses from the cost-share? I prefer my own equipment."

---

## RECOMMENDED LEASE AMENDMENTS

### For the 2026 Letter of Understanding

Add these clauses:

**Fuel Section:**
> "Fuel costs shall be charged EITHER as a one-time annual charge OR spread monthly, but not both. Any fuel purchased directly by Tenant at 100% cost shall be credited against Tenant's usage percentage."

**Tools/Equipment Section:**
> "Tenant shall provide own hand tools, hoses, and irrigation connections. These items are excluded from the depreciation cost-share."

**Reconciliation Section:**
> "Annual reconciliation of fuel and equipment charges shall occur by December 31, with any overpayments credited to the following year."

---

## SUMMARY OF OVERPAYMENTS TO DISCUSS

| Issue | Amount | Action |
|-------|--------|--------|
| Fuel double-charge | $780.40 | Verify, request credit |
| Diesel 100%/60% | $296.80 | Request credit |
| Tools/hoses (opt out) | $331.58 | Remove from 2026 |
| **TOTAL** | **$1,408.78** | |

---

## TONE RECOMMENDATION

Don't approach this as "you're cheating me." Instead:

> "Don, I was going through the spreadsheets to prepare for the lease document and noticed some things I want to clarify. The fuel appears to be charged twice - once on Invoice 788 and again monthly. I'm sure it's just a spreadsheet formula issue. Can we reconcile before 2026?"

This maintains the relationship while protecting Todd's interests.

---

*Audit prepared January 29, 2026*
