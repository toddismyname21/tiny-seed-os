---
name: unpdf-extraction
description: Quirks of unpdf text extraction on Harvie/Market Wagon vendor order PDFs
metadata:
  type: project
---

The wholesale order importer (`src/lib/wholesale-import.ts`) parses vendor order
PDFs with `unpdf` (`extractText`, `mergePages:true`). Three non-obvious traits of
the extracted text, verified against real Harvie + Market Wagon samples:

1. **One flat string, no newlines.** All whitespace collapses to single spaces, so
   parse on a space-delimited string — never assume line structure.
2. **Harvie SKUs split mid-token.** A SKU printed "TSF-SOMETH-SALAD" extracts as
   "TSF- SOMETH- SALAD". Canonicalize by stripping spaces; for catalog lookup
   normalize BOTH sides (uppercase, strip non-alphanumerics) so a seed key like
   "TSFSOMETHSALAD" still matches.
3. **Market Wagon embeds invisible Private-Use-Area glyphs (e.g. U+E088) BETWEEN
   date digits** — "20260630" extracts with PUA chars wedged in, silently breaking
   every date/number regex. `sanitizeExtractedText()` strips PUA (U+E000–U+F8FF) +
   zero-width/BOM chars but KEEPS the visible "▢" (U+25A2) checkbox, which the MW
   parser uses as a per-customer-row delimiter.

**Why:** without sanitizing/normalizing, the MW delivery_date parsed as null and
Harvie SKUs never matched seed mappings. **How to apply:** if a new vendor format
or unpdf upgrade lands, re-dump the raw extracted text and inspect char codes
BEFORE trusting any regex — see [[verify-real-output]].
