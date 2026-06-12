#!/usr/bin/env python3
"""Reusable Resend sender. Reads RESEND_API_KEY + RESEND_FROM_EMAIL from .env.
Usage: send_email.py --to a@b.com --subject "S" --text "..." [--attach f1.pdf f2.pdf]
Prints the Resend message id on success (proof of send)."""
import sys, json, base64, urllib.request, urllib.error, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load_env(p):
    e = {}
    for ln in p.read_text().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1)
            e[k.strip()] = v.strip().strip('"').strip("'")
    return e

env = load_env(ROOT / ".env")
KEY = env.get("RESEND_API_KEY"); FROM = env.get("RESEND_FROM_EMAIL")
if not KEY or not FROM:
    sys.exit("Missing RESEND_API_KEY or RESEND_FROM_EMAIL in .env")

ap = argparse.ArgumentParser()
ap.add_argument("--to", required=True)
ap.add_argument("--subject", required=True)
ap.add_argument("--text", required=True)
ap.add_argument("--attach", nargs="*", default=[])
a = ap.parse_args()

TEAM = ["tinyseedcsa@gmail.com", "todd@tinyseedfarmpgh.com", "tinyseedfleurs@gmail.com"]
body = {"from": FROM, "to": [a.to], "subject": a.subject, "text": a.text, "reply_to": TEAM, "bcc": ["todd@tinyseedfarmpgh.com"]}
atts = []
for f in a.attach:
    p = Path(f)
    atts.append({"filename": p.name, "content": base64.b64encode(p.read_bytes()).decode()})
if atts:
    body["attachments"] = atts

req = urllib.request.Request(
    "https://api.resend.com/emails", data=json.dumps(body).encode(), method="POST",
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
             "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
             "Accept": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode())
        print(f"SENT ✓  HTTP {r.status}  id={data.get('id')}  to={a.to}")
except urllib.error.HTTPError as e:
    print(f"FAILED  HTTP {e.code}: {e.read().decode()}")
    sys.exit(1)
