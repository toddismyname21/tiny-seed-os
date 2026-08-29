# Proposal: Certification Core → Supabase
_2026-08-29 · PM_Architect · for Todd's approval before any code_

## Why now
OEFFA inspection **Friday Sept 18** (Emily Patt). The Action Items report (08/26)
warns the blank renewal OSP "may result in a noncompliance" — the farm already took a
Notice of Noncompliance on June 30 this year. INPUT_LOG and PEST_LOG hold **zero rows**.
NOP §205.103 requires records "readily understood and audited," retained **5 years**,
spanning purchase → production → sale.

The MCP/voice layer is useless over Apps Script (auth-walled, slow, fragile). It is
solid over Postgres. This migration is the foundation for both the inspection and the
conversational assistant.

## Scope — what moves NOW (1,236 rows + 2 empty tables)
| Piece | Rows | Note |
|---|---:|---|
| `fields` | 22 + **~7 missing** | JS5, F3M, Brassica, Lower, J?, I?, 2× flower — resolved WITH Todd |
| `beds` | 212 | 4-ft centres, lengths already known |
| `input_log` | 0 → new | **born in Supabase, never in Sheets** |
| `pest_log` | 0 → new | same |
| `seed_lots` | 259 | lot IDs + QR — the strongest records we have |
| `plantings` | 743 | unique Batch_IDs; 30 bad bed refs; "Tomato"/"Tomatoes" drift |
| `harvest_log` | 0 → new | actuals live on plantings (560 First_Harvest dates) — link, don't retype |

**Explicitly NOT in scope before Sept 18:** the other ~40 sheets, 60+ HTML pages,
148k-line Apps Script, greenhouse/financial/marketing/HR modules. Data in motion
during an inspection is how audits go wrong.

## Designed for the FULL migration (Todd's requirement)
1. **One `farm` schema, additive.** New tables land in the same Supabase project the
   CSA/wholesale portal already uses — one database at the end, not two systems.
2. **`legacy_ref` column on every migrated row** (sheet name + row/batch id). Every
   row stays traceable to its Sheets origin; nothing is orphaned when the rest moves.
3. **A migration ledger** (`docs/specs/OS_MIGRATION_LEDGER.md`): every sheet in the OS
   listed with a verdict — MIGRATE / MERGE (redundant with X) / RETIRE (stale) /
   KEEP-ON-SHEETS-FOR-NOW. Filled in as we go; becomes the map for the big move.
   The redundancy Todd predicts is real and already visible: "Tomato" vs "Tomatoes"
   as separate crops, 11 parallel inventory systems, 4 morning briefs.
4. **Canonical crop table** with alias mapping — fixes the 102-name drift once, and
   every future module inherits it.
5. **Reads move, writes cut over.** Sheets stay readable until each consumer is
   repointed; the authoritative write target flips table-by-table, never "big bang."

## Schema (summary — full DDL in the migration files)
- `fields(id, code, name, status[active/retired], acres, notes, legacy_ref)`
- `beds(id, field_id→fields, code, length_ft, width_in, legacy_ref)` — UNIQUE(field_id, code)
- `crops(id, canonical_name)` + `crop_aliases(alias→crop_id)`
- `seed_lots(id, lot_code UNIQUE, crop_id, variety, organic_status, supplier, qr_url, legacy_ref)`
- `plantings(id, batch_code UNIQUE, crop_id, variety, bed_id NULLABLE, status,
  plan/actual sow·transplant·harvest dates, yield_lbs, legacy_ref)`
- `input_log(id, applied_on, field_id→fields NOT NULL, product, omri_listed, rate,
  method, applied_by, purpose, source_evidence, created_by, created_at)`
- `pest_log(id, observed_on, field_id, pest, severity, control_measure, product_used,
  omri_listed, results, notes, created_at)`
- All RLS service-role/admin; timestamped migrations per the shared-kernel rules.

**Design rule for the two logs:** `field_id` is NOT NULL. A compliance record against
a nonexistent field is exactly the failure we're eliminating — which is why fields go
first and the 7 missing ones get created before any record can need them.

## Order of work
| Day | Step | Gate before next step |
|---|---|---|
| 1 | Fields + beds migrated; **7 missing fields resolved with Todd** (10-min naming session) | count parity 22+new/212; spot-check lengths vs Sheets |
| 1 | `input_log` + `pest_log` created | this week's real applications (Revita Pro + feather meal on SO) entered as first rows |
| 2 | Crops + aliases; seed_lots; plantings | 743/743 batch codes present; 30 bad bed refs on an exception list, not guessed |
| 2 | Inspection views: per-field input history, seed-lot list, planting traceability | renders match Sheets source |
| 3+ | Receipt-photo → `input_log` intake (proven: 1.2¢/receipt, refuses to guess) | Todd approves each batch before insert |
| after 9/18 | MCP server on these tables → voice · then the OS migration ledger drives the big move | — |

## Verification (every step)
Row-count parity · checksum spot samples · exception lists for anything that doesn't
map (never silently dropped, never guessed) · CHANGE_LOG entries · Sheets untouched
(read-only source) so rollback = "keep using Sheets."

## What I need from Todd
1. **Approve this proposal.**
2. **10 minutes on the 7 missing fields** — real names, roughly where, retired-or-active.
3. Ongoing: receipt photos / recollections for the input reconstruction — via
   remote-control photo drops, which already work.
