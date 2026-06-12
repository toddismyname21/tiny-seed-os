#!/usr/bin/env python3
"""
SHARE-SCOPED member email sender — the ONLY approved way to email CSA members.
Enforces the email-send-discipline rule: no wide/unverified sends.

Guarantees:
  * You MUST name the exact share type(s) the campaign is for (--shares).
  * Recipients are fetched ONLY for active members of those shares (verified),
    deduped by customer, with test accounts excluded.
  * A CONTENT KIND (--content) declares which shares the message is valid for;
    the script REFUSES if --shares includes a share the content doesn't apply to.
  * DRY-RUN by default. Prints the audience breakdown + a sample. Sends only
    with --apply.
  * reply_to is always the team inboxes.

Usage:
  send_member_campaign.py --content summer_box --shares summer_veg \
      --subject "..." --textfile body.txt            # dry-run preview
  ... --apply                                         # actually send

See docs/CSA_EMAIL_SEND_PROTOCOL.md.
"""
import argparse, json, re, sys, time, urllib.request, urllib.error
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEAM = ["tinyseedcsa@gmail.com", "todd@tinyseedfarmpgh.com", "tinyseedfleurs@gmail.com"]
TEST = {"test@test.com", "fakeemailsofake@gmail.com", "freetodd21@gmail.com"}
TESTSUB = ("fakeemail", "freetodd21", "test@test")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"

# CONTENT KIND -> the share types the message is VALID for. Sending to any
# share outside this set is blocked. Add kinds deliberately; keep them tight.
CONTENT_VALID_SHARES = {
    "summer_box":   {"summer_veg"},
    "spring_box":   {"spring_veg"},
    "fall_box":     {"fall_veg"},
    "flower":       {"flower"},
    "flex":         {"flex"},
    "veg_all":      {"summer_veg", "spring_veg", "fall_veg"},
    # 'general' = truly applies to everyone (rare; e.g. a farm-wide notice with
    # NO share-specific content). Use sparingly and only with Todd's sign-off.
    "general":      {"summer_veg","spring_veg","fall_veg","flower","flex","add_on","wholesale_csa"},
}

def load_env():
    e = {}
    for ln in (ROOT/".env").read_text().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1); e[k.strip()] = v.strip().strip('"').strip("'")
    return e

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", required=True, choices=sorted(CONTENT_VALID_SHARES))
    ap.add_argument("--shares", required=True, help="comma-separated share types to target")
    ap.add_argument("--subject", required=True)
    ap.add_argument("--textfile", required=True, help="path to plain-text body; {{first_name}} supported")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    shares = [s.strip() for s in a.shares.split(",") if s.strip()]
    valid = CONTENT_VALID_SHARES[a.content]
    bad = [s for s in shares if s not in valid]
    if bad:
        sys.exit(f"BLOCKED: content '{a.content}' is only valid for {sorted(valid)}; "
                 f"you targeted {bad}. Fix the audience or the content kind.")

    env = load_env()
    URL = env["PUBLIC_SUPABASE_URL"]; KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
    RKEY = env["RESEND_API_KEY"]; FROM = env["RESEND_FROM_EMAIL"]
    SBH = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    body_tpl = Path(a.textfile).read_text()

    # Fetch active members of ONLY the targeted shares; dedup by customer.
    inlist = ",".join(shares)
    req = urllib.request.Request(
        f"{URL}/rest/v1/members?select=share_type,customer:customers(contact_name,email)"
        f"&status=eq.active&share_type=in.({inlist})", headers=SBH)
    rows = json.loads(urllib.request.urlopen(req, timeout=40).read())
    people = {}
    for m in rows:
        c = m.get("customer") or {}
        em = (c.get("email") or "").strip().lower()
        if not em or em in TEST or any(s in em for s in TESTSUB):
            continue
        people.setdefault(em, {"first": (c.get("contact_name") or "there").split()[0].capitalize(),
                               "shares": set()})["shares"].add(m["share_type"])

    print(f"CONTENT: {a.content}  (valid for {sorted(valid)})")
    print(f"TARGET shares: {shares}")
    print(f"AUDIENCE: {len(people)} unique active customers (test excluded)")
    print(f"  breakdown by share held: {dict(Counter(s for p in people.values() for s in p['shares']))}")
    for em, p in list(people.items())[:5]:
        print(f"   e.g. {p['first']} <{em}>  shares={sorted(p['shares'])}")

    if not a.apply:
        print("\nDRY-RUN. Review the audience above. Re-run with --apply to send.")
        return

    ok = fail = 0
    for em, p in people.items():
        text = body_tpl.replace("{{first_name}}", p["first"])
        payload = {"from": FROM, "to": [em], "subject": a.subject, "text": text, "reply_to": TEAM, "bcc": ["todd@tinyseedfarmpgh.com"]}
        r = urllib.request.Request("https://api.resend.com/emails", data=json.dumps(payload).encode(),
            method="POST", headers={"Authorization": f"Bearer {RKEY}", "Content-Type": "application/json",
                                    "User-Agent": UA, "Accept": "application/json"})
        try:
            urllib.request.urlopen(r, timeout=40); ok += 1
        except Exception as ex:
            fail += 1; print(f"  FAIL {em}: {ex}")
        time.sleep(0.35)
    print(f"\nSENT {ok}, failed {fail}  (content={a.content}, shares={shares})")

if __name__ == "__main__":
    main()
