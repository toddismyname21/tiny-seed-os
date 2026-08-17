---
name: Delegation and verification pattern
description: The proven pattern for delegating implementation work — spec → builder → verifier + integration-watcher → fix → deploy
type: feedback
---

The working delegation pattern for non-trivial implementation:

1. **PM researches** — read all relevant code, understand data flows, check backend endpoints
2. **PM writes detailed spec** — every function, every file, every edge case, acceptance criteria
3. **Delegate to fullstack-builder** — with the complete spec as the prompt
4. **Run verifier** — check every item in the spec was implemented correctly
5. **Run integration-watcher** — check nothing else breaks (especially API routing, localStorage formats, shared endpoints)
6. **Fix issues found** — delegate fixes to builder (PM doesn't edit implementation files)
7. **Deploy** — git push + clasp push + clasp deploy -i

**Why:** This pattern caught the `addField` POST routing bug before it shipped. The verifier confirmed 27/27 checks passed, but the integration-watcher found the cross-system issue. Both are needed.

**How to apply:** Always run verifier AND integration-watcher in parallel after builder completes. Never skip the integration check, especially when the feature touches shared endpoints or localStorage keys.
