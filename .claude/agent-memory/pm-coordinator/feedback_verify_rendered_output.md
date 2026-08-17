---
name: verify-rendered-output
description: For CSA portal/admin UI + print features, "build passes / tests pass" is NOT proof it works — verify the ACTUAL rendered/printed output on the live site before telling Todd it's done.
metadata:
  type: feedback
---

**Before telling Todd a CSA portal/admin feature is done, confirm the ACTUAL rendered/printed result works — not just that the build/tests pass.**

**Why:** 2026-06-09 Todd called out "some mediocre work has been done… it would be nice if you confirm features are working when you add them." Real bugs shipped because I (and builders) treated `npm run build` + `tsx tests` green as "done": the box-labels print rendered the admin header (and the "fix" still needed several rounds), and the **stop-manifest print came out BLANK** — its own `@media print` rule `main > div:first-child { display:none }` was hiding `.print-doc` (the manifest content), which a build/test pass can never catch. Todd reviews on the live site / actual printout; build-green ≠ working.

**How to apply — for any UI/print/admin change:**
1. After deploy, **fetch the actual rendered page** and inspect the real DOM + CSS, don't trust the builder's "build passes." Admin pages are auth-gated → mint an admin session and fetch with the cookie (see [[csa-portal-prod-deploy]] / member-page-verification approach): admin `generate_link` → POST `/auth/v1/verify` (token_hash) → access_token → build the `sb-<ref>-auth-token` cookie → curl the live page.
2. **For print features specifically:** check the `@media print` rules against the REAL DOM structure — confirm the content container is NOT hidden and the chrome IS. Watch for selectors like `main > div:first-child` that assume a structure that isn't true (AdminShell's page heading is a SIBLING before `<main>`, not inside it — so `main > div:first-child` hits the page content, not the heading).
3. Verify the specific thing the user asked for is actually present in the output (e.g. color bands have color, address shows, no orphan rows), with a concrete check (grep the rendered HTML/CSS), and SAY what you verified.
4. Slow down on the "it's live 🎉" — only claim done after the rendered-output check. Browser cache can also mask a deploy ([[csa-portal-prod-deploy]]); tell Todd to hard-refresh (⌘⇧R) but ALSO verify the live asset yourself.
