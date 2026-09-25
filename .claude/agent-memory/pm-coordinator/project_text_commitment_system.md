---
name: text-commitment-system
description: Text-message commitment capture + noise reduction initiative — Phase 0 DONE (scripts/read_messages.py, real measured numbers); Phase 1 = phone→account identity resolution, needs an additive migration Todd hasn't approved yet.
metadata:
  type: project
---

Building a system to capture commitments Todd makes over text (chefs + CSA members text requests, he agrees, then forgets) and to cut spam noise. Started 2026-08-16.

**Why:** this is the "Text-promise catcher" line item on [[responsibilities-board]] — Todd explicitly asked to be held accountable for promises made over TEXT. Now unblocked because we run on his OWN MacBook.

**PHASE 0 — COMPLETE. Measured, not estimated:**
- `scripts/read_messages.py` — READ-ONLY chat.db analyzer (`mode=ro`, never writes). Subcommands `stats` and `senders`. Prints NO message bodies by default.
- **99.7% of messages have NULL `text`** on macOS 26 — bodies live in `attributedBody` typedstream blobs. A naive byte-scan recovers **0%**. MUST use `pytypedstream` (installed) → 99.8% recovery. **GOTCHA: the decoder emits payload as `bytes` events, not `str` — handling only `str` gives a silent 0%.** Extraction rule = FIRST non-class-name string (typedstream puts NSString contents before attribute dicts); validated 6/6 on ground-truth rows; "first" vs "longest" disagree on 6.2% of the corpus.
- **249 senders, 42 days history, 41.8 msgs/day. 64 two-way conversations vs 184 one-way (burner spam, ~2 msgs each → block-lists are futile, design must be ALLOW-LIST shaped). Only 17/64 (26.6%) of real conversations match an account; 47 unidentified.**
- Mac holds only **42 days** of history (since 2026-07-05). Messages in iCloud is OFF (`CloudKitMetaData/` empty) — turning it on syncs full history. Text Message Forwarding already works (iMessage 1,225 / SMS 282 / RCS 248).

**PHASE 1 — COMPLETE.** Migration `0087_phone_identity_resolution.sql` applied: `customer_phones` alias table (many phones → one customer, `phone` UNIQUE so attribution is never ambiguous, RLS admin-only) + nullable `wholesale_account_contacts.phone` (chefs text from personal cells, not the restaurant main line). Backfilled 213 → 212 rows. `scripts/read_messages.py` gained `unknown` (linking queue) and `link` commands. `database.types.ts` hand-updated (types are NOT auto-generated here).

**⚠️ THE BIG REFRAME (2026-08-16) — the original premise was WRONG.** Classifying all 67 two-way conversations: 20 match an account, **0** Contacts names match a customer, **44 are in Contacts but are NOT customers**, 3 unknown. The people Todd actually texts are his OPERATIONAL network — employees (Erin/Austin "Tiny Seed Market"), vendors ("Mushroom Mike"), counterparties like **Dan Simon** (Simon Farm landlord, already a standing weekly-text item on the board). So forgotten commitments are mostly NOT customer-facing. **Commitment capture must be relationship-AGNOSTIC and land on `docs/TODD_RESPONSIBILITIES_BOARD.md`; `member_comms` is only a secondary sink for the member subset.** Do not rebuild this around CSA members.

**macOS Contacts is the PRIMARY identity signal** — 56/67 two-way senders (84%) are named there; Messages stores no names. Mining message text for self-introductions yields ~0 usable matches (people don't re-introduce themselves mid-relationship). Read all account-source `~/Library/Application Support/AddressBook/**/AddressBook-v22.abcddb` read-only and merge.

**Data landmine:** 7 customers share `(717) 725-5177` — Todd's OWN number (the one the dead Twilio alert loop texted). It resolved to a fake seed record "Chef Mike / mike@greenvalley.com" until deleted. Several demo/seed customers (farmfresh.com, bcfoodbank.org, "Walk-in Customer") still pollute the production `customers` table — cleanup pending Todd.

**Architecture decisions (Todd-aligned):** local-first; NO cloud LLM on message content (privacy + unresolved PA wiretap question); NO Apps Script/Sheets — land in `member_comms` (which already has `channel='text'`, **0 rows so far**); do NOT switch on `sms_system/imessage_monitor.py` (never ran, stale webhook URL, ships everything to Sheets, no spam handling).

**Ruled OUT by research:** a custom iOS `ILMessageFilterExtension` app (can't see iMessage or known contacts — useless here); auto-replying to customers; fully-automated commitment extraction (the NLP ceiling is ~80% F1 — human confirm/reject is mandatory). On-device filtering only HIDES; only 7726 + carrier tools reduce actual volume. Apple exempts anyone Todd has replied to 3+ times from filtering, so real customers are safe by design.

Research: `docs/research/TEXT_SYSTEM_TECH_RESEARCH_2026.md`, `docs/research/TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md`.
Related: [[twilio-sms-setup]] (Twilio has delivered ZERO messages ever — don't build on it), [[responsibilities-board]].
