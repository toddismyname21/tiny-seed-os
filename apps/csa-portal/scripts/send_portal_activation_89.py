#!/usr/bin/env python3
"""Send the 'activate your portal' email to the members who haven't logged in.
Reads scripts/out/portal_access_report.csv. Personalized first name.
Asks them to: log in, confirm pickup location, add a valid cell number.
Sends via Resend (browser UA). Sends Todd a copy first. Reports per-recipient."""
import csv, json, base64, time, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "scripts" / "out" / "portal_access_report.csv"
DRY = "--apply" not in sys.argv
PORTAL = "https://csa.tinyseedfarm.com"

def load_env(p):
    e={}
    for ln in p.read_text().splitlines():
        ln=ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k,v=ln.split("=",1); e[k.strip()]=v.strip().strip('"').strip("'")
    return e
env=load_env(ROOT/".env"); KEY=env["RESEND_API_KEY"]; FROM=env["RESEND_FROM_EMAIL"]
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def first_name(n):
    n=(n or "").strip()
    return n.split()[0].capitalize() if n else "there"

def body_text(fn, email):
    return f"""Hi {fn},

Your Tiny Seed CSA season starts Wednesday, June 10. Please take two minutes to set up your member portal so your share gets to you smoothly.

1. Sign in (no password): go to {PORTAL} and enter this email — {email}. We'll send you a one-tap link.

2. Confirm your pickup location so you know exactly where and when to get your share.

3. Add a valid cell number. We text you the moment your share arrives at your stop, so you're never guessing.

If you're a Flex member, the portal is also where you choose your items each week.

Questions, or something looks off? Just reply to this email.

— Tiny Seed Farm"""

def send(to, fn, email):
    payload={"from":FROM,"to":[to],
             "subject":"Set up your Tiny Seed CSA portal — confirm pickup + add your cell",
             "text":body_text(fn,email)}
    req=urllib.request.Request("https://api.resend.com/emails",data=json.dumps(payload).encode(),method="POST",
        headers={"Authorization":f"Bearer {KEY}","Content-Type":"application/json","User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=60) as r:
        return json.loads(r.read().decode()).get("id")

rows=list(csv.DictReader(CSV.open()))
print(f"Recipients in report: {len(rows)}  | mode: {'DRY-RUN' if DRY else 'SEND'}")
if DRY:
    for r in rows[:5]:
        print(f"  would send → {first_name(r['name']):12} {r['email']}")
    print("  ...")
    print("Re-run with --apply to send.")
    sys.exit(0)

# Todd copy first (preview of exact content)
try:
    tid=send("todd@tinyseedfarmpgh.com","Todd","[your email]")
    print(f"Todd copy sent ✓ id={tid}")
except Exception as e:
    print(f"Todd copy FAILED: {e}")

ok=fail=0; fails=[]
for r in rows:
    to=(r["email"] or "").strip()
    if not to or "@" not in to:
        fail+=1; fails.append((r['name'],to,"no email")); continue
    try:
        send(to, first_name(r["name"]), to); ok+=1
    except urllib.error.HTTPError as e:
        fail+=1; fails.append((r['name'],to,f"HTTP {e.code}"))
    except Exception as e:
        fail+=1; fails.append((r['name'],to,str(e)[:40]))
    time.sleep(0.35)  # stay under Resend rate limit

print(f"\n=== RESULT ===  sent: {ok}   failed: {fail}")
for n,e,why in fails: print(f"  FAIL  {n} <{e}>  — {why}")
