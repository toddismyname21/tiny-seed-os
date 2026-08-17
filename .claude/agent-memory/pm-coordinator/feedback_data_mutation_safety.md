---
name: data-mutation-safety
description: Before any looped/bulk DB write — verify the SELECT filter is well-formed (PostgREST needs col=op.value), confirm the row COUNT, patch by explicit id. A malformed filter silently mutated the whole table once.
metadata:
  type: feedback
---

**Never run a mutating loop over a query result without first verifying the query filtered correctly and the row count is what you expect.**

**Why:** 2026-06-08 I wrote a PostgREST filter `email.ilike.*naomi*` (MISSING the `=` — correct is `email=ilike.*naomi*`). PostgREST silently IGNORED the malformed param and returned **469 customers instead of 1**, and my patch loop nulled `biweekly_week` for **ALL active summer-veg + spring-veg members** — corrupting biweekly box delivery. Recovered only because `audit_log` (trigger-managed, with before/after `diff`) had the originals; restored 81 members. Todd had just told me to stop making obvious mistakes — this was one.

**How to apply — every DB write:**
1. **PostgREST filter syntax:** `column=operator.value` (e.g. `email=ilike.*x*`, `status=eq.active`). A bare `column.operator.value` (no `=`) is treated as an unknown param and IGNORED → the query returns EVERYTHING. Double-check every filter has `=`.
2. **Verify before mutate:** run the SELECT first, print the **count + a sample**. If a "find one customer" query returns 50+, STOP — the filter is broken.
3. **Patch by explicit id**, ideally one-at-a-time with a printed confirmation, not a loop over an unverified result set.
4. **Recovery exists:** `audit_log` (table_name, row_id, operation, `diff`={before,after}, changed_at) logs every members write — use it to undo bad mutations.
5. Treat data writes like the email-send rule ([[email-send-discipline]]): verify the target, preview, then act.
