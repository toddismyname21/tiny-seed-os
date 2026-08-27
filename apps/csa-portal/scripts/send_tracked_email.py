#!/usr/bin/env python3
"""
send_tracked_email.py — send 1:1 emails from Todd's personal Gmail with a
per-recipient OPEN-tracking pixel.

WHY: Todd sends wholesale emails one-to-one from todd@tinyseedfarmpgh.com (so a
chef replies to a human, not a no-reply blast) and gets NO open data. Resend's
webhook tracking (the campaigns system) only covers blasts sent THROUGH Resend.
This module is the Gmail path: it embeds a unique 1×1 transparent GIF in each
email whose URL carries an opaque per-recipient token. When the recipient's
mail client loads images, it hits the public pixel endpoint
(https://csa.tinyseedfarm.com/api/track/o/<token>.gif) which stamps the open.

WHAT IT DOES (send_tracked):
  1. INSERT one tracked_email_sends row (the labelled batch).
  2. For each recipient: mint a url-safe token (>=24 chars), INSERT a
     tracked_email_recipients row (send_id, token, email, name, account_id,
     sent_at=now()).
  3. Build a multipart/alternative email: a text/plain part AND a text/html
     part that ends with the invisible tracking pixel.
  4. Send via the Gmail API as todd@tinyseedfarmpgh.com (OAuth refresh token →
     access token → users/me/messages/send with base64url raw MIME).
  5. PATCH recipient_count on the send. Return the send_id.

REUSE: import send_tracked(...) from another script. Or run as a CLI for a
quick test send (see --help). Supabase writes go through PostgREST with the
service-role key (bypasses RLS). Gmail creds come from tinypm/.env +
tinypm/.oauth_tokens/todd.json — the same pattern the repo's other Gmail
scripts use.

Run with the venv that has `requests`:
  /Users/samanthapollack/Documents/TIny_Seed_OS/scripts/migrate-csa/.venv/bin/python \
      apps/csa-portal/scripts/send_tracked_email.py --help
"""

from __future__ import annotations

import argparse
import base64
import json
import secrets
import sys
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape
from pathlib import Path
from typing import Callable, Optional

import requests

import sys as _sys, pathlib as _pl
_sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from verify_facts import enforce as _enforce_facts  # 2026-08-27 outgoing fact gate

# ─── Paths / constants ──────────────────────────────────────────────────────
CSA_ROOT = Path(__file__).resolve().parents[1]          # apps/csa-portal
REPO_ROOT = CSA_ROOT.parents[1]                         # TIny_Seed_OS
TINYPM_DIR = REPO_ROOT / "tinypm"
TOKEN_FILE = TINYPM_DIR / ".oauth_tokens" / "todd.json"

FROM_EMAIL = "todd@tinyseedfarmpgh.com"
FROM_NAME = "Todd Wilson — Tiny Seed Farm"
# PUBLIC origin the email clients hit. This is the live custom domain mapped to
# the Vercel deployment; the pixel route is /api/track/o/<token>.gif.
PIXEL_ORIGIN = "https://csa.tinyseedfarm.com"

GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# A browser UA — Cloudflare in front of api.supabase.com 1010s the default
# python-requests UA (same trick run_migration.py uses).
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


# ─── env loading ────────────────────────────────────────────────────────────
def _load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


_CSA_ENV = _load_env(CSA_ROOT / ".env")
_TINYPM_ENV = _load_env(TINYPM_DIR / ".env")

SUPABASE_URL = _CSA_ENV.get("PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = _CSA_ENV.get("SUPABASE_SERVICE_ROLE_KEY", "")
GOOGLE_CLIENT_ID = _TINYPM_ENV.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = _TINYPM_ENV.get("GOOGLE_CLIENT_SECRET", "")


def _require(value: str, what: str) -> str:
    if not value:
        sys.exit(f"ERROR: missing {what}. Check apps/csa-portal/.env + tinypm/.env.")
    return value


# ─── Supabase REST (PostgREST, service-role) ────────────────────────────────
def _sb_headers(prefer: Optional[str] = None) -> dict[str, str]:
    key = _require(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _sb_insert(table: str, row: dict) -> dict:
    """INSERT one row, return it (representation)."""
    url = f"{_require(SUPABASE_URL, 'PUBLIC_SUPABASE_URL')}/rest/v1/{table}"
    resp = requests.post(
        url, headers=_sb_headers("return=representation"),
        data=json.dumps(row), timeout=60,
    )
    if resp.status_code >= 300:
        sys.exit(f"ERROR: insert into {table} failed: HTTP {resp.status_code}: {resp.text}")
    body = resp.json()
    return body[0] if isinstance(body, list) else body


def _sb_patch(table: str, match: dict, patch: dict) -> None:
    """PATCH rows matching equality filters."""
    base = f"{_require(SUPABASE_URL, 'PUBLIC_SUPABASE_URL')}/rest/v1/{table}"
    params = "&".join(f"{k}=eq.{v}" for k, v in match.items())
    resp = requests.patch(
        f"{base}?{params}", headers=_sb_headers("return=minimal"),
        data=json.dumps(patch), timeout=60,
    )
    if resp.status_code >= 300:
        sys.exit(f"ERROR: patch {table} failed: HTTP {resp.status_code}: {resp.text}")


def _sb_delete(table: str, match: dict) -> None:
    """DELETE rows matching equality filters (used by --cleanup)."""
    base = f"{_require(SUPABASE_URL, 'PUBLIC_SUPABASE_URL')}/rest/v1/{table}"
    params = "&".join(f"{k}=eq.{v}" for k, v in match.items())
    resp = requests.delete(
        f"{base}?{params}", headers=_sb_headers("return=minimal"), timeout=60,
    )
    if resp.status_code >= 300:
        sys.exit(f"ERROR: delete {table} failed: HTTP {resp.status_code}: {resp.text}")


# ─── Gmail OAuth ────────────────────────────────────────────────────────────
def _get_gmail_access_token() -> str:
    """
    Return a valid Gmail access token for todd@. Reads tinypm/.oauth_tokens/
    todd.json; if the cached access_token is expired (or near expiry) refreshes
    it via the refresh_token + client id/secret, and writes the new token back
    to the file (same self-healing pattern as tinypm/email_integration.py).
    """
    if not TOKEN_FILE.is_file():
        sys.exit(f"ERROR: Gmail token file not found: {TOKEN_FILE}")
    data = json.loads(TOKEN_FILE.read_text())

    if "gmail.send" not in data.get("scope", ""):
        sys.exit("ERROR: todd.json lacks the gmail.send scope; re-authorize Gmail.")

    access = data.get("access_token")
    expires_at = data.get("expires_at", "")
    needs_refresh = True
    if access and expires_at:
        try:
            exp = datetime.fromisoformat(expires_at)
            # treat naive timestamps as local time
            if datetime.now() < exp - timedelta(minutes=5):
                needs_refresh = False
        except ValueError:
            needs_refresh = True

    if not needs_refresh:
        return access

    refresh = data.get("refresh_token")
    if not refresh:
        sys.exit("ERROR: access token expired and no refresh_token present in todd.json.")

    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": _require(GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
            "client_secret": _require(GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET"),
            "refresh_token": refresh,
            "grant_type": "refresh_token",
        },
        timeout=60,
    )
    if resp.status_code >= 300:
        sys.exit(f"ERROR: Gmail token refresh failed: HTTP {resp.status_code}: {resp.text}")
    tok = resp.json()
    new_access = tok["access_token"]

    # Persist the refreshed token so subsequent runs reuse it.
    data["access_token"] = new_access
    expires_in = int(tok.get("expires_in", 3600))
    data["expires_at"] = (datetime.now() + timedelta(seconds=expires_in)).isoformat()
    if tok.get("refresh_token"):
        data["refresh_token"] = tok["refresh_token"]
    try:
        TOKEN_FILE.write_text(json.dumps(data, indent=2))
    except OSError as e:
        print(f"WARN: could not persist refreshed Gmail token: {e}", file=sys.stderr)

    return new_access


def _gmail_send_raw(access_token: str, mime_bytes: bytes) -> str:
    """POST a base64url MIME message to Gmail. Returns the Gmail message id."""
    raw = base64.urlsafe_b64encode(mime_bytes).decode()
    resp = requests.post(
        GMAIL_SEND_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        data=json.dumps({"raw": raw}),
        timeout=60,
    )
    if resp.status_code >= 300:
        raise RuntimeError(f"Gmail send failed: HTTP {resp.status_code}: {resp.text}")
    return resp.json().get("id", "")


# ─── email body construction ────────────────────────────────────────────────
def _pixel_tag(token: str) -> str:
    """The invisible 1×1 tracking pixel <img>, pointed at the live endpoint."""
    return (
        f'<img src="{PIXEL_ORIGIN}/api/track/o/{token}.gif" '
        'width="1" height="1" alt="" '
        'style="display:none;width:1px;height:1px;border:0;overflow:hidden">'
    )


def _auto_html_from_text(text: str) -> str:
    """Turn a plain-text body into safe minimal HTML (paragraphs + <br>)."""
    safe = escape(text).replace("\r\n", "\n").replace("\r", "\n")
    blocks = [b for b in safe.split("\n\n")]
    paras = "".join(
        f"<p style=\"margin:0 0 1em 0\">{b.replace(chr(10), '<br>')}</p>"
        for b in blocks
        if b.strip()
    )
    return (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,'
        'Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">'
        f"{paras}</div>"
    )


def _build_mime(to_email: str, to_name: Optional[str], subject: str,
                text_body: str, html_body: str, token: str) -> bytes:
    """multipart/alternative: text + html(+pixel). Pixel goes ONLY in HTML."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((FROM_NAME, FROM_EMAIL))
    msg["To"] = formataddr((to_name or "", to_email)) if to_name else to_email

    html_with_pixel = f"{html_body}\n{_pixel_tag(token)}"
    # Per RFC 2046, the alternative parts are ordered least→most preferred;
    # the client shows the LAST it can render — so html (with the pixel) last.
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_with_pixel, "html", "utf-8"))
    return msg.as_bytes()


def _new_token() -> str:
    """Opaque, url-safe token. token_urlsafe(24) → 32 chars (>=24 requirement),
    ~192 bits of entropy — unguessable."""
    return secrets.token_urlsafe(24)


# ─── public API ─────────────────────────────────────────────────────────────
def send_tracked(
    label: str,
    subject: str,
    recipients: list[dict],
    body_text_fn: Callable[[dict], str],
    body_html_fn: Optional[Callable[[dict], str]] = None,
    *,
    dry_run: bool = False,
) -> str:
    """
    Send a labelled batch of 1:1 tracked emails. Returns the send_id (uuid).

    recipients: list of { email, name?, account_id?, **vars }. The **vars are
    passed straight to body_text_fn/body_html_fn so callers can template per
    recipient (e.g. {"email":..., "restaurant":"Dinette"}).

    body_text_fn(recipient) -> plain-text body (required).
    body_html_fn(recipient) -> HTML body (optional; auto-derived from text if
                               omitted). The tracking pixel is appended to the
                               HTML automatically — do NOT add it yourself.

    dry_run=True inserts the DB rows + builds the MIME but does NOT call Gmail
    (useful for testing the data path without sending).
    """
    if not label or not label.strip():
        raise ValueError("label is required")
    if not subject or not subject.strip():
        raise ValueError("subject is required")
    if not recipients:
        raise ValueError("recipients is empty")

    send = _sb_insert("tracked_email_sends", {
        "label": label.strip(),
        "subject": subject.strip(),
        "channel": "gmail",
        "sent_by": FROM_EMAIL,
        "recipient_count": 0,
    })
    send_id = send["id"]
    print(f"→ Created send {send_id}  label={label!r}")

    access_token = None if dry_run else _get_gmail_access_token()

    sent_ok = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    for r in recipients:
        email = (r.get("email") or "").strip()
        if not email:
            print("  · skipping recipient with no email", file=sys.stderr)
            continue
        name = r.get("name")
        account_id = r.get("account_id")
        token = _new_token()

        _sb_insert("tracked_email_recipients", {
            "send_id": send_id,
            "token": token,
            "email": email,
            "name": name,
            "account_id": account_id,
            "sent_at": now_iso,
        })

        text_body = body_text_fn(r)
        # 2026-08-27 fact gate. Bodies are built PER RECIPIENT here, so each one is
        # checked — a merge field could put a different number in each copy.
        _enforce_facts(text_body, subject, "")
        html_body = body_html_fn(r) if body_html_fn else _auto_html_from_text(text_body)
        mime = _build_mime(email, name, subject, text_body, html_body, token)

        if dry_run:
            print(f"  · [dry-run] {email}  token={token}")
            sent_ok += 1
            continue

        try:
            msg_id = _gmail_send_raw(access_token, mime)
            sent_ok += 1
            print(f"  ✓ sent to {email}  gmail_id={msg_id}  token={token}")
        except Exception as e:  # noqa: BLE001 — report + continue the batch
            print(f"  ✗ FAILED to {email}: {e}", file=sys.stderr)

    _sb_patch("tracked_email_sends", {"id": send_id}, {"recipient_count": sent_ok})
    print(f"✓ Done. send_id={send_id}  recipients_sent={sent_ok}/{len(recipients)}")
    return send_id


# ─── CLI ────────────────────────────────────────────────────────────────────
def _main() -> int:
    ap = argparse.ArgumentParser(
        description="Send a 1:1 tracked email (open-tracking pixel) from Todd's Gmail.",
    )
    ap.add_argument("--label", required=True, help='Admin label, e.g. "Wholesale — week of June 29"')
    ap.add_argument("--subject", required=True, help="Inbox subject line.")
    ap.add_argument("--to", required=True, action="append",
                    help="Recipient email. Repeat for multiple. Use email:Name to set a name.")
    ap.add_argument("--text", help="Plain-text body. If omitted, read from --text-file or stdin.")
    ap.add_argument("--text-file", help="Path to a plain-text body file.")
    ap.add_argument("--html-file", help="Optional path to an HTML body file (pixel appended).")
    ap.add_argument("--account-id", help="Optional wholesale_accounts.id to link ALL recipients.")
    ap.add_argument("--dry-run", action="store_true", help="Insert rows + build MIME but do NOT send.")
    ap.add_argument("--cleanup-send", help="DELETE a send (and its recipients via cascade) by send_id, then exit.")
    a = ap.parse_args()

    if a.cleanup_send:
        _sb_delete("tracked_email_sends", {"id": a.cleanup_send})
        print(f"✓ Deleted send {a.cleanup_send} (recipients cascade-deleted).")
        return 0

    if a.text is not None:
        text_body = a.text
    elif a.text_file:
        text_body = Path(a.text_file).read_text()
    else:
        text_body = sys.stdin.read()
    if not text_body.strip():
        sys.exit("ERROR: empty body. Provide --text, --text-file, or pipe text on stdin.")

    html_body = Path(a.html_file).read_text() if a.html_file else None

    recipients = []
    for spec in a.to:
        if ":" in spec:
            em, nm = spec.split(":", 1)
            rec = {"email": em.strip(), "name": nm.strip()}
        else:
            rec = {"email": spec.strip()}
        if a.account_id:
            rec["account_id"] = a.account_id
        recipients.append(rec)

    send_tracked(
        label=a.label,
        subject=a.subject,
        recipients=recipients,
        body_text_fn=lambda _r: text_body,
        body_html_fn=(lambda _r: html_body) if html_body else None,
        dry_run=a.dry_run,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
