---
name: verify-real-output
description: Read actual extracted/DB output before coding parsers or trusting a spec's schema
metadata:
  type: feedback
---

When a task hands you an idealized example (PDF text, an API payload, a "verified"
schema), get the REAL output first and code against that.

**Why:** On the wholesale importer, the task's sample text showed clean SKUs
("TSFSOMETHSALAD") and ISO dates ("2026-06-30"); the actual unpdf output had split
SKUs and invisible glyphs (see [[unpdf-extraction]]). Separately, the task spec
said `wholesale_order_items.qty/unit_price_cents/line_total_cents` were nullable —
the LIVE schema had them NOT NULL. Coding to the spec would have shipped a parser
that returned null dates and a commit that threw on insert.

**How to apply:**
- For parsers: dump the raw extracted text (and inspect char codes around anything
  that "should" be simple) before writing a single regex.
- For DB writes: query `information_schema.columns` (via the migration runner —
  [[migration-runner]]) to confirm real nullability/types, don't trust the spec.
- This is the project's "NEVER assume — always verify" rule in practice; the
  owner's standard is $500/hr-consultant correctness, not "matches the example."
