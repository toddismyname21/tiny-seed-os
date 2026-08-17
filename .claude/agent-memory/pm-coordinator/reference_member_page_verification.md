---
name: member-page-verification
description: How to independently fetch an AUTHENTICATED member page on the live CSA portal (to verify builder claims) — mint a session via Supabase admin, build the sb-auth cookie, fetch
metadata:
  type: reference
---

**To verify what a CSA member actually sees on the live site (csa.tinyseedfarm.com), authenticate as them and fetch the page yourself — don't trust builder "endpoint passed" claims.** This is how the PM found the nav-covers-submit bug after two builders missed it (2026-06-08).

**Method (works; uses service-role key in `apps/csa-portal/.env`):**
1. `POST {SUPABASE_URL}/auth/v1/admin/generate_link` with `{type:"magiclink", email, redirect_to}` → get `action_link`.
2. GET the action_link WITHOUT following redirects → the `Location` header carries the session in the URL **hash**: `#access_token=…&refresh_token=…&expires_at=…` (admin links use the implicit grant).
3. Build the `@supabase/ssr` cookie: name `sb-<projectref>-auth-token` (ref = `melizsvabemhaqeaqtyw`), value `"base64-"+base64url(JSON.stringify(session))` where session = `{access_token, refresh_token, expires_in:3600, expires_at, token_type:"bearer", user:{id:<jwt.sub>, aud:"authenticated", role:"authenticated", email}}`. Chunk into `.0/.1` if >3180 chars.
4. Fetch the target path with header `Cookie: <that>` + a browser `User-Agent` → authenticated HTML. `getUser()` revalidates the access_token server-side, so a minimal user object is fine.

**Gotchas:** the **phone + pickup-ack gates** will redirect member fetches to `/account/add-phone` or `/account/confirm-pickup` — set `customers.phone` + `customers.pickup_acknowledged_at` via service-role first to reach gated pages, then RESET them (null) afterward so a real test account walks the full forced flow. Resend/Supabase calls need a **browser User-Agent** (Cloudflare 1010 otherwise — see [[mac-email-sending]]). Test accounts: freetodd21@gmail.com (flex member, set up for walkthroughs), test@test.com. Reusable script pattern lives in `apps/csa-portal/scripts/` (portal_access_report.py etc.). Related: [[project_csa_flex_ordering_build]].
