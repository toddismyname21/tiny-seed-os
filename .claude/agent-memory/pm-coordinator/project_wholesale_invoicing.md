---
name: wholesale-invoicing
description: How Tiny Seed wholesale invoicing actually works — Todd does ALL of it manually in QuickBooks, nothing linked invoices to orders until 2026-08-16; QB doc-number series identify who created what.
metadata:
  type: project
---

**TODD DOES ALL INVOICING HIMSELF, MANUALLY, IN QUICKBOOKS.** He confirmed this 2026-08-16. Do NOT speculate that staff (Loren/Frankie) invoice — I did, from the fact that Black Radish invoices are mostly FLOWER SALES, and it was wrong. Ask, don't infer.

**THE ROOT DEFECT (fixed 2026-08-16):** nothing ever wrote an invoice number back to the order. `wholesale_orders.invoice_number` was empty on 69 of 70 live orders while QuickBooks held **77 invoices for 2026 ($26,777.16)**. An empty `invoice_number` therefore proves NOTHING about whether an order was billed. Every "uninvoiced total" I computed before realising this was wrong — first $17,628.91, then $1,944.92, both garbage. **Never report an uninvoiced figure derived from `invoice_number` alone.**

**QB DOC-NUMBER SERIES tell you the creation method** (verified):
- `10xxx` (32 invoices, through Jul 3) and `7849xxx` (26, through Aug 14) = created BY TODD in the QuickBooks UI.
- **BLANK DocNumber = created via the API** (i.e. by Claude). API-created invoices get no DocNumber automatically.
- **`9000001+` = the reserved SYSTEM range** Todd chose 2026-08-16 so system-generated invoices are always distinguishable. 9000001–9000013 = the 13 created that night; 9000014–9000016 = three older API invoices back-numbered. Two paid API invoices (Mediterra $962, Allegro $197.50) were deliberately LEFT blank — never renumber a settled invoice.

**Todd's invoicing rhythm is BURSTY, not sloppy:** big catch-up sessions (Jul 3 = 9 invoices, Jul 28 = 9) then a trickle. Deliveries in the gaps age out silently — that's how Harvie's 8/03 + 8/10 sat unbilled and how Omar at Allegro ended up chasing two missing invoices himself.

**Invoicing rules (Todd directives):**
- Invoice **on DELIVERY**, not on order — only then is the fulfilled quantity final.
- Bill from `qty_packed`, NEVER `qty`. A chef is never charged for produce they didn't receive.
- **Market Wagon auto-pays through their own system — EXCLUDE from invoicing entirely.**
- Never email an invoice without Todd seeing it first; create-in-QB and let him send.

**Gotchas:** QB late fees (1.5%) auto-apply and mask order↔invoice matching — net them out before comparing. Invoices routinely cover MULTIPLE deliveries ("7/8, 7/15 and 7/22 deliveries"), so date-proximity matching is worthless; the customer memo often names the real delivery dates. Item mapping must be EXACT-name only — fuzzy matching mapped "Kale (bunch)"→"Curly Kale (12 ct)" and "Cabbage (head)"→"Cabbage (25# Bulk)". Fall back to the generic `Wholesale` item (Id 513) with the true product name in the description.

Related: [[text-commitment-system]] (the text sweep that surfaced the shortfalls), [[quickbooks-integration]].
