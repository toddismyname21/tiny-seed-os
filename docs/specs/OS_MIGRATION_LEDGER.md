# OS Migration Ledger
_Every sheet in Tiny Seed OS gets a verdict here as we touch it: MIGRATE / MERGE
(redundant with X) / RETIRE (stale) / KEEP-ON-SHEETS-FOR-NOW. This is the map for
the full migration. Started 2026-08-29 with the certification core._

| Sheet | Verdict | Destination | Date | Evidence / note |
|---|---|---|---|---|
| REF_Fields | **MIGRATED** | `farm_fields` (22 rows) | 2026-08-29 | parity 22/22; Todd reconciled 7 unmapped names (HOL=brassica, IOL=lower/retiring, JL=J, IL=I, F7M+F11M=flowers, F3M was F3L). JS5 unresolved. |
| REF_Beds | **MIGRATED** | `farm_beds` (212 rows) | 2026-08-29 | parity 212/212; 30" beds, 4-ft centres |
| INPUT_LOG | **BORN IN SUPABASE** | `input_log` | 2026-08-29 | 0 rows existed in Sheets — nothing to migrate. `field_id` NOT NULL; `source_evidence` NOT NULL. |
| PEST_LOG | **BORN IN SUPABASE** | `pest_log` | 2026-08-29 | same |
| SEED_INVENTORY | queued (Day 2) | `seed_lots` | — | 259 lots, lot IDs + QR |
| PLANNING_2026 | queued (Day 2) | `plantings` + `crops` | — | 743 unique batch codes; 102 crop-name variants incl. Tomato/Tomatoes → canonical crops + aliases; 30 bad bed refs → exception list |
| WHOLESALE_* / CSA_MEMBERS | **ALREADY MIGRATED** (pre-dates ledger) | portal tables | — | live production |
| 11 inventory sheets | unexamined — suspect MERGE | — | — | Todd: work is stale, expect redundancy |
| 4 morning-brief systems | unexamined — suspect RETIRE ×3 | — | — | CLAUDE.md already bans creating a 5th |
| ~25 remaining sheets | unexamined | — | — | verdict on first touch |
