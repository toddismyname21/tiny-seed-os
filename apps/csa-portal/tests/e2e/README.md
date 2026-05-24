# CSA Portal — Automated Quality Harness

Four checks, runnable locally and in CI:

| Check | Tool | Command |
|-------|------|---------|
| End-to-end journeys | Playwright | `npm run test:e2e` |
| Accessibility | axe-core (via Playwright) | `npm run test:a11y` |
| Logged-out route protection only | Playwright (`@unauth` tag) | `npm run test:unauth` |
| Performance budget | Lighthouse CI | `npm run lhci` |

> Spec files avoid the substring `auth` in their **filenames**
> (`member-journeys.spec.ts`, `logged-out.spec.ts`) because the repo's
> `scripts/pre-flight-check.sh` risk classifier treats `**/auth*` paths as
> deploy-critical. The Playwright project + tag are still called `unauth`.

## The auth problem (and how it's solved)

The portal is **magic-link only** — there is no password to type, and a
previous smoke-test attempt was abandoned over the email redirect. We
never touch an inbox. Instead, `global-setup.ts` mints a real session for
a dedicated **test member** using the Supabase **service-role admin API**:

1. `auth.admin.createUser` ensures the test member's `auth.users` row
   exists (idempotent — a 422 "already registered" is fine).
2. `auth.admin.generateLink({ type: 'magiclink' })` returns a
   `hashed_token` **without sending any email**.
3. The anon client's `auth.verifyOtp({ type: 'magiclink', token_hash })`
   exchanges that token for a genuine access + refresh token pair.
4. We re-emit that session as cookies through the **same
   `@supabase/ssr` `createServerClient`** the app's middleware reads —
   capturing its `setAll` output. This guarantees the cookie name
   (`sb-<ref>-auth-token`) and the `base64-`-prefixed chunked encoding
   match the app byte-for-byte, immune to `@supabase/ssr` version drift.
5. Those cookies are written to a Playwright `storageState`
   (`tests/e2e/.auth/member.json`, gitignored). Every authenticated test
   reuses it.

`global-setup` also **seeds a deterministic swappable box item** for the
test member's upcoming Wednesday so the `/box` swap journey is genuinely
exercisable even before the real season posts a box, then records it to
`swap-fixture.json` for the box spec.

### Test member requirement

`E2E_TEST_EMAIL` (default `test@test.com`) **must already exist as a
`customers` row** with `customer_type='csa'` and an active `members`
share. The harness creates the matching `auth.users` entry automatically,
but it does **not** create the CSA membership (that's real business data).

## Env

The harness reads `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `E2E_TEST_EMAIL` from `process.env`,
loaded from the portal's `.env` / `.env.test`. See `.env.test.example`.
Never hardcode keys. In CI, provide them as GitHub secrets.

## Running

```bash
npm install
npx playwright install --with-deps chromium

# all E2E (boots `npm run preview` automatically)
npm run test:e2e

# just the unauth probe (no Supabase needed)
npm run test:unauth

# a11y only
npm run test:a11y

# perf budget (boots its own server)
npm run lhci
```

Point at a deployed build instead of local preview:

```bash
PLAYWRIGHT_BASE_URL=https://<vercel-preview>.vercel.app npm run test:e2e
```

## Known, documented limitation — swap POST on local origin

`/api/box/swap` enforces a CSRF check requiring the POST `Origin` to equal
the **hardcoded production origin** `https://csa.tinyseedfarm.com`. On a
local preview the browser sends `http://localhost:4321`, so the API
correctly returns **403 forbidden**. The swap test still drives the full
client state machine (Swap → options sheet → confirm sheet → submit) and
asserts a result toast appears; it asserts a *successful* swap + row flip
only when run against the production origin. This is real product
behavior, not a test gap.
