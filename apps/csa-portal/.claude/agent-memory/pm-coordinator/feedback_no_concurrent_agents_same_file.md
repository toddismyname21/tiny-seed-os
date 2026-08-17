---
name: no-concurrent-agents-same-file
description: NEVER run two builder agents concurrently on the same file — caused a live security exposure 2026-08-07 (MERGED TOTAL.js)
metadata:
  type: feedback
---

Never dispatch a second builder agent against a file another agent is still editing — especially `apps_script/MERGED TOTAL.js`.

**Why:** On 2026-08-07 two fullstack-builders raced on MERGED TOTAL.js. One's temporary unauthenticated diagnostic endpoint (`_diagFindWorkers`, added to PUBLIC_GET_ACTIONS) got swept into the other's `clasp push` + deploy — a LIVE endpoint enumerating employee data with no auth. Each agent saw the other's edits as a mysterious "background process" and fought it, reverting work back and forth. PM had to do emergency incident-response directly (strip endpoint, redeploy, verify).

**How to apply:**
- One agent per file at a time. If a follow-up change is needed, SendMessage the SAME agent (context intact) instead of spawning a new one.
- If an agent must add a temporary diagnostic endpoint, require it to (a) gate it with a random secret param, never PUBLIC_GET_ACTIONS, and (b) prove removal with a live curl before finishing.
- After any multi-agent touch of a deployed file: verify live behavior with curl AND `git diff` local-vs-committed before declaring done.
