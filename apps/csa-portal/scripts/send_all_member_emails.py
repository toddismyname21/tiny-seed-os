#!/usr/bin/env python3
"""Send the 4 approved member emails via Resend.
1 Flex (share_type=flex)  2 Allison Park (pickup=Simon's)  3 Everyone (all active)
4 The 89 (portal_access_report.csv). Dedup by email; exclude test accounts.
DRY-RUN unless --apply."""
import csv, json, time, sys, urllib.request, urllib.error
from pathlib import Path

import sys as _sys, pathlib as _pl
_sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from verify_facts import enforce as _enforce_facts  # 2026-08-27 outgoing fact gate

ROOT = Path(__file__).resolve().parents[1]
APPLY = "--apply" in sys.argv
ONLY = [a for a in sys.argv[1:] if a in ("flex","allison","everyone","89")]
SIMONS = "2f7d376c-fc51-4a12-8b5d-50f3a1baed85"
TEST = {"test@test.com","fakeemailsofake@gmail.com","freetodd21@gmail.com"}
TESTSUB = ("fakeemail","freetodd21","test@test")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
SIG = "\n\n— Farmer Todd and the Tiny Seed Crew"

def env():
    e={}
    for ln in (ROOT/".env").read_text().splitlines():
        ln=ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k,v=ln.split("=",1); e[k.strip()]=v.strip().strip('"').strip("'")
    return e
EN=env(); URL=EN["PUBLIC_SUPABASE_URL"]; SKEY=EN["SUPABASE_SERVICE_ROLE_KEY"]
RKEY=EN["RESEND_API_KEY"]; FROM=EN["RESEND_FROM_EMAIL"]

def sb(path):
    r=urllib.request.Request(f"{URL}{path}",headers={"apikey":SKEY,"Authorization":f"Bearer {SKEY}"})
    return json.loads(urllib.request.urlopen(r,timeout=40).read())

def fn(name):
    name=(name or "").strip()
    return name.split()[0].capitalize() if name else "there"

def dedup(rows):
    out={}
    for r in rows:
        c=r.get("customer") or {}
        em=(c.get("email") or "").strip().lower()
        if not em or em in TEST or any(s in em for s in TESTSUB): continue
        out.setdefault(em, fn(c.get("contact_name")))
    return out  # {email: first_name}

def recips_flex():    return dedup(sb("/rest/v1/members?select=customer:customers(contact_name,email)&share_type=eq.flex&status=eq.active"))
def recips_allison(): return dedup(sb(f"/rest/v1/members?select=customer:customers(contact_name,email)&pickup_location_id=eq.{SIMONS}&status=eq.active"))
def recips_every():   return dedup(sb("/rest/v1/members?select=customer:customers(contact_name,email)&status=eq.active"))
def recips_89():
    out={}
    for r in csv.DictReader((ROOT/"scripts/out/portal_access_report.csv").open()):
        em=(r["email"] or "").strip().lower()
        if em and "@" in em and em not in TEST and not any(s in em for s in TESTSUB):
            out[em]=fn(r["name"])
    return out

def B_flex(f,e): return (f"Hi {f},\n\nWeek 1 of the summer CSA is here. Here's how Flex works.\n\n"
 "Choose your own box from this week's list and spend it from your Flex balance — head lettuces, greens, herbs, salad mixes, seedlings, and more.\n\n"
 "Your default is the Small CSA Share ($35) — your order comes pre-filled with it, so you're covered. Keep it, upgrade to the Family Share ($45), or swap in individual items. You must tap Submit for your order to count.\n\n"
 "How to order: sign in at csa.tinyseedfarm.com, go to Flex, review the pre-filled Small Share, add or remove items, and Submit by Tuesday, June 9, 6:00 PM.\n\n"
 "Going forward, ordering opens Thursdays and closes Tuesday 7 AM.\n\n"
 "This is Week A — the first week of the season. It lands on the second Wednesday (June 10), but it's still Week 1 / Week A.\n\n"
 "We text you when your share arrives — please make sure your cell number is in your profile.\n\nQuestions? Just reply."+SIG)
def B_allison(f,e): return (f"Hi {f},\n\nOne change to your pickup for the season.\n\n"
 "All Allison Park shares are now at Simon's Farm Stand — 4312 Middle Rd, Allison Park, on Wednesdays. You'll get a text when your share arrives, so please add your cell number in the portal if it isn't there.\n\n"
 "If Simon's doesn't work for you, you have options: request home delivery, or choose another stop — including our new South Side Market (Sundays 10–2). Switch anytime under Account → Pickup.\n\n"
 "Nothing to do if Simon's works — you're all set.\n\nQuestions? Just reply."+SIG)
def B_every(f,e): return (f"Hi {f},\n\nHere's what's in this week's share, plus a new way to pick up.\n\n"
 "This week's box — Week A (Wednesday, June 10):\n"
 "• Small share: Salad Turnips, Bok Choy, 2 Heads of Lettuce, Cilantro, Radishes, Herb Seedling\n"
 "• Family share: everything above, plus Potatoes, Dill, and Swiss Chard\n\n"
 "(On a biweekly Week-B schedule? This is the Week-A box — yours arrives next week.)\n\n"
 "New Sunday pickup — South Side Market: 2120 Jane St, Pittsburgh, Sundays 10:00 AM–2:00 PM (May–September). Shares are available during market hours. Prefer it? Switch under Account → Pickup. No change needed if your current spot works.\n\n"
 "Make sure your cell number is current — at our regular stops we text you when your share arrives.\n\nQuestions? Just reply."+SIG)
def B_89(f,e): return (f"Hi {f},\n\nYour Tiny Seed CSA season starts Wednesday, June 10. Please take two minutes to set up your member portal so your share gets to you smoothly.\n\n"
 f"1. Sign in (no password): go to csa.tinyseedfarm.com and enter your email — {e}. We'll send a one-tap link.\n"
 "2. Confirm your pickup location so you know exactly where and when to get your share.\n"
 "3. Add a valid cell number — we text you the moment your share arrives.\n\n"
 "If you're a Flex member, the portal is also where you choose your items each week.\n\nQuestions, or something looks off? Just reply."+SIG)

CAMPAIGNS=[
 ("flex","Your Week 1 Flex order is open — choose by Tuesday 6 PM",recips_flex,B_flex),
 ("allison","Your Allison Park pickup is now Simon's Farm Stand",recips_allison,B_allison),
 ("everyone","Your June 10 CSA share + a new Sunday pickup option",recips_every,B_every),
 ("89","Set up your Tiny Seed CSA portal — confirm pickup + add your cell",recips_89,B_89),
]

TEAM_REPLY=["todd@tinyseedfarmpgh.com","tinyseedfleurs@gmail.com"]
def send(to,subj,text):
    _enforce_facts(text, subj, "")
    p={"from":FROM,"to":[to],"subject":subj,"text":text,"reply_to":TEAM_REPLY}
    r=urllib.request.Request("https://api.resend.com/emails",data=json.dumps(p).encode(),method="POST",
        headers={"Authorization":f"Bearer {RKEY}","Content-Type":"application/json","User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(r,timeout=60) as x: return json.loads(x.read().decode()).get("id")

grand=0
for key,subj,rfn,bfn in CAMPAIGNS:
    if ONLY and key not in ONLY: continue
    rec=rfn()
    print(f"\n[{key}] recipients: {len(rec)}  subj: {subj}")
    grand+=len(rec)
    if not APPLY:
        for em,f in list(rec.items())[:3]: print(f"    e.g. {f} <{em}>")
        continue
    ok=fail=0
    for em,f in rec.items():
        try: send(em,subj,bfn(f,em)); ok+=1
        except urllib.error.HTTPError as e: fail+=1; print(f"    FAIL {em}: HTTP {e.code} {e.read().decode()[:80]}")
        except Exception as e: fail+=1; print(f"    FAIL {em}: {str(e)[:60]}")
        time.sleep(0.35)
    print(f"  → sent {ok}, failed {fail}")
print(f"\n{'APPLIED' if APPLY else 'DRY-RUN'} — total recipients across campaigns: {grand}")
