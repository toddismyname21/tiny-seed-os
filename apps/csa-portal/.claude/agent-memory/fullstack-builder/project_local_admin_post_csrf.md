---
name: local-admin-post-csrf
description: Admin POST endpoints 403 on the local dev server — a dual-CSRF artifact, not a bug
metadata:
  type: project
---

Admin form-POST endpoints (e.g. /api/admin/notices/[id]/done) return **403 on the
local Astro dev server**, even with a valid minted admin cookie.

**Why:** two CSRF guards stack and can't both pass on localhost:
1. Astro's built-in `security.checkOrigin` validates the request `Origin` against the
   ACTUAL host (`http://localhost:4321`). Body on mismatch: "Cross-site POST form
   submissions are forbidden".
2. The app's own `isSameOriginPost(request, PORTAL_ORIGIN)` validates against
   `PORTAL_ORIGIN = 'https://csa.tinyseedfarm.com'` (hardcoded in `src/lib/onboarding.ts`).

So Origin=localhost passes (1) but fails (2); Origin=csa.tinyseedfarm.com passes (2)
but fails (1). No single Origin satisfies both locally. In PRODUCTION the host IS
csa.tinyseedfarm.com, so a real same-origin form POST passes both at once. The existing
notices admin "Done"/"Cancel" buttons have this exact same local limitation.

**How to apply:** When render-verifying admin POST flows, don't treat a local 403 as a
defect. GET pages verify fine with the minted cookie (admin GET = 200). To prove POST
handler logic locally, unit-test the pure pieces (e.g. an open-redirect `return_to`
validator) directly rather than driving the HTTP endpoint. Cookie minting: see
[[migration-runner]]-style scripts and `scripts/mint-session.mjs <email>`
(magic-link → verifyOtp → @supabase/ssr cookie). Run Playwright from inside
apps/csa-portal so node resolves the project's `playwright` package.
