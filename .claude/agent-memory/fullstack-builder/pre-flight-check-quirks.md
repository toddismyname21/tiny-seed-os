---
name: pre-flight-check.sh known false-positive patterns
description: scripts/pre-flight-check.sh duplicate-detection bugs and the fixes I landed for them on 2026-05-11.
type: feedback
---

`scripts/pre-flight-check.sh` (called by the pre-commit hook) has three duplicate-detection bugs that bite any new file outside the existing dashboard patterns. I fixed all three on 2026-05-11 (commit 1bd93ea), but the script may be modified again in future — these are the patterns to look for if commits start being rejected as "duplicates."

**Why:** Pre-commit hook exits non-zero on CRITICAL findings, blocking commits.

**How to apply:** If a commit fails with `❌ COMMIT BLOCKED: Pre-flight check found critical issues`, check whether the flagged "duplicate" matches one of these patterns before treating it as a real conflict:

1. **Astro dynamic-route filenames** like `[id].astro`, `[slug].astro`. The check does `find -iname "*${BASENAME}*"` — bash globs treat `[id]` as a character class, matching ANY file with `i` or `d` in its name. Fix: whitelist these as framework-convention filenames (added to `WHITELISTED_NAMES`).

2. **Directory-index filenames** like `index.astro`, `index.ts`. Every Astro folder has one — they're legitimately re-used per directory, never duplicate implementations. Fix: whitelist these too.

3. **Build artifacts** in `.vercel/output/`, `.next/`, `.astro/`, `.output/`. The `find -iname` scan walks these by default — every shipped page has 2-3 copies in build trees, all of which look like CRITICAL match targets. Fix: add to the `-prune` list alongside `node_modules`, `.git`, etc.

4. **Self-exclude with bracketed paths**: `grep -v "^\./${FILE_NAME}$"` uses regex by default, so a path like `route/[id]/start.ts` is interpreted as a character class and the file fails to self-exclude. Fix: use `grep -vF` (fixed string).

5. **REST-style parallel resource handlers** like `status.ts`, `delete.ts`, `edit.ts`, `update.ts`, `save.ts`, `send.ts`. The same basename legitimately appears under multiple parent resources (admin/members/[id]/status.ts vs admin/route/[id]/stops/[stopId]/status.ts; admin/box-contents/save.ts vs admin/box-plan/save.ts; admin/weekly-email/send.ts vs admin/vendor-orders/send.ts) — they are NEVER duplicate implementations. Fix: demote these matches from CRITICAL to WARNING via a `REST_VERB_BASENAMES` list. `save.ts` + `send.ts` were added to this list 2026-05-27 (commit 641d6f7) after they blocked the CSA Ops Admin Phase 1 commit.

6. **Shared lib module + its same-named consumer route** (fixed 2026-05-24). A `src/lib/<name>.ts` legitimately shares a basename with the route/page that imports it — e.g. `src/lib/recipes.ts` backs `src/pages/api/admin/recipes.ts`; `src/lib/flex.ts` backs `src/pages/account/flex.astro`; `src/lib/weekly-email.ts` backs `src/pages/admin/weekly-email.astro`. The `-iname "*${BASENAME}*"` EXACT_MATCH flagged these as CRITICAL duplicates in BOTH directions (whichever of the pair was the new file). Fix in CHECK 1: `IS_LIB_MODULE` (path under lib/utils/helpers) + per-match lib-vs-nonlib detection; demote to WARNING (`LIB_LAYER_OK`) when exactly one side of the new-file↔matches pair is under lib/utils/helpers (lib-backs-route layering). Two files BOTH under lib/ with the same name still stay CRITICAL.

7. **Admin page + its member-facing counterpart** (fixed 2026-05-24, commit 270371f). A page under `*/admin/*` and the member-side page with the same basename are intentionally DIFFERENT surfaces (admin compose/manage AdminShell page vs member read-only MemberShell view), not duplicates — e.g. `src/pages/admin/stop-notes.astro` vs `src/pages/stop-notes.astro`. EXACT_MATCH flagged them CRITICAL in both directions. Fix mirrors the lib-layer logic: `IS_ADMIN_PAGE` (path under admin/) + per-match admin-vs-nonadmin detection; demote to WARNING (`ADMIN_LAYER_OK`) when exactly one side straddles the admin/-vs-non-admin boundary. Two files BOTH under admin/ (or both non-admin) with the same name still stay CRITICAL. This was the [[csa-stop-notes-feature]] commit blocker.

**Anti-pattern to avoid:** Do NOT use `git commit --no-verify` to skip the hook. The CLAUDE.md says "NEVER skip hooks unless the user explicitly requests it. If a hook fails, investigate and fix the underlying issue." Fix the script.
