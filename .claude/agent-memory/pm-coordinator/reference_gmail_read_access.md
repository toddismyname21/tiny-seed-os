---
name: gmail-read-access
description: How to search/read Todd's actual Gmail (todd@tinyseedfarmpgh.com) read-only via the stored Google OAuth token — for finding info in his real inbox.
metadata:
  type: reference
---

Todd's real Gmail inbox (`todd@tinyseedfarmpgh.com`, ~14k messages) is searchable **read-only** from this machine.

**How:**
- Refresh token + account metadata: `tinypm/.oauth_tokens/todd.json` (has `refresh_token`, scope includes `gmail.readonly`/`gmail.modify`/`gmail.send`). The stored `access_token` is usually expired — refresh it.
- Client creds: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `tinypm/.env` (the token file does NOT contain client_id/secret/token_uri).
- Refresh: `POST https://oauth2.googleapis.com/token` with `client_id`, `client_secret`, `refresh_token`, `grant_type=refresh_token` → fresh `access_token`.
- Search: `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=<gmail query>` then `users/me/messages/{id}` for content. Standard Gmail search operators work (`from:`, `subject:`, `after:`, `before:`, `has:attachment`).
- Python: use `scripts/migrate-csa/.venv/bin/python` (has `requests`; no google-api-python-client needed — hit the REST API directly). No google libs installed in any venv.

**Apple Mail is NOT useful** — `~/Library/Mail/V10` has only ~2 cached messages (Drafts). Use the Gmail API path above, not the local Mail store.

**Notes:** It's Todd's own mailbox at his request — authorized. Broad queries return a lot (an H-2A-ish query hit ~201) — narrow with `from:`/`subject:`/date operators before pulling content. Related: [[mac-email-sending]] (that's for *sending* via Resend; this is for *reading* Gmail).
