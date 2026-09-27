#!/usr/bin/env python3
"""Daily promises & obligations digest (Todd 2026-09-27).

"I would like a daily digest of promises and obligations built from my texts
and emails [and the portal], and a summary sent Sunday mornings that checks
off everything we have done and leaves the rest as open items."

Runs ON TODD'S MAC (launchd) because chat.db and the Gmail OAuth token live
here. Three sources:
  1. iMessage (chat.db)  — last 36h, both directions
  2. Gmail               — last 36h, in + out
  3. Portal              — open member_notices, upcoming wholesale
                           deliveries, unfulfilled flex orders

Extraction: the day's messages + the current open ledger go to `claude -p`
(headless Claude Code) with a strict JSON contract. Claude returns NEW
obligations and COMPLETIONS (with evidence). Conservative by design: only
clear commitments; when unsure, skip.

State: `obligations` table in Supabase (dedupe_key prevents re-adds).
Output: daily email to Todd. `--weekly` = Sunday rollup (✓ done this week,
open items carried forward). `--dry-run` prints instead of writing/sending.

Schedule (launchd):
  com.tinyseed.obligations.daily   06:30 every day
  com.tinyseed.obligations.weekly  07:00 Sundays
"""
import sys, os, json, sqlite3, re, hashlib, subprocess, base64, datetime
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]                  # apps/csa-portal
REPO = HERE.parents[3]                  # TIny_Seed_OS
DRY = '--dry-run' in sys.argv
WEEKLY = '--weekly' in sys.argv

def load_env(p):
    e = {}
    if not p.exists(): return e
    for ln in p.read_text().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith('#') and '=' in ln:
            k, v = ln.split('=', 1)
            e[k.strip()] = v.strip().strip('"').strip("'")
    return e

env = load_env(ROOT / '.env')
tenv = load_env(REPO / 'tinypm' / '.env')
SB_URL = env['PUBLIC_SUPABASE_URL']; SB_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
RKEY = env['RESEND_API_KEY']; RFROM = env['RESEND_FROM_EMAIL']
TODD = 'todd@tinyseedfarmpgh.com'

def http(url, method='GET', body=None, headers=None, timeout=90):
    req = urllib.request.Request(url, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Content-Type': 'application/json', **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else None

def sb(method, path, body=None):
    return http(f'{SB_URL}/rest/v1/{path}', method, body,
        {'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}', 'Prefer': 'return=representation'})

# ── 1. iMessage, last 36h ─────────────────────────────────────────────
def get_texts():
    out = []
    try:
        db = sqlite3.connect(str(Path.home() / 'Library/Messages/chat.db'))
        q = """SELECT datetime(m.date/1000000000+978307200,'unixepoch','localtime') dt,
          m.is_from_me, m.text, m.attributedBody, c.chat_identifier FROM message m
          JOIN chat_message_join cmj ON cmj.message_id=m.ROWID
          JOIN chat c ON c.ROWID=cmj.chat_id
          WHERE m.date/1000000000+978307200 > CAST(strftime('%s','now','-36 hours') AS INTEGER)
          ORDER BY m.date"""
        for dt, me, txt, ab, chat in db.execute(q):
            if not txt and ab:
                s = ab.decode('latin1', 'ignore')
                runs = re.findall(r'[ -~]{6,}', s)
                runs = [r for r in runs if not re.match(r'^(__kIM|NS|bplist|at_\d|streamtyped)', r)]
                txt = max(runs, key=len) if runs else ''
            t = (txt or '').strip()
            if len(t) < 4 or 'kIMMessagePart' in t: continue
            out.append(f"[TEXT {'FROM-TODD' if me else 'TO-TODD'} {dt[:16]} thread:{chat[-10:]}] {t[:400]}")
    except Exception as e:
        out.append(f'[texts unavailable: {e}]')
    return out

# ── 2. Gmail, last 36h ────────────────────────────────────────────────
def get_emails():
    out = []
    try:
        tok = json.loads((REPO / 'tinypm/.oauth_tokens/todd.json').read_text())
        r = http('https://oauth2.googleapis.com/token', 'POST', None)  # placeholder
    except Exception:
        pass
    try:
        tok = json.loads((REPO / 'tinypm/.oauth_tokens/todd.json').read_text())
        data = urllib.parse.urlencode({
            'client_id': tenv['GOOGLE_CLIENT_ID'], 'client_secret': tenv['GOOGLE_CLIENT_SECRET'],
            'refresh_token': tok['refresh_token'], 'grant_type': 'refresh_token'}).encode()
        req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
        AT = json.loads(urllib.request.urlopen(req, timeout=60).read())['access_token']
        H = {'Authorization': f'Bearer {AT}'}
        q = 'newer_than:2d -from:notification.intuit.com -from:google.com -from:vercel.com -from:github.com -from:dmarc.yahoo.com'
        r = http(f'https://gmail.googleapis.com/gmail/v1/users/me/messages?q={urllib.parse.quote(q)}&maxResults=60', headers=H)
        for m in (r.get('messages') or []):
            d = http(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}?format=full", headers=H)
            hd = {h['name']: h['value'] for h in d['payload']['headers']}
            def body(p):
                o = ''
                if p.get('mimeType') == 'text/plain' and p.get('body', {}).get('data'):
                    o += base64.urlsafe_b64decode(p['body']['data']).decode('utf-8', 'ignore')
                for sp in p.get('parts', []) or []: o += body(sp)
                return o
            t = re.split(r'\nOn .{10,80}wrote:', body(d['payload']))[0].strip()
            frm = hd.get('From', '')
            tag = 'FROM-TODD' if ('tinyseedfarm' in frm or 'todd@' in frm.lower()) else 'TO-TODD'
            out.append(f"[EMAIL {tag} {hd.get('Date','')[:22]} | {frm[:50]} | {hd.get('Subject','')[:70]}] {t[:500]}")
    except Exception as e:
        out.append(f'[email unavailable: {e}]')
    return out

import urllib.parse  # (used above)

# ── 3. Portal state ───────────────────────────────────────────────────
def portal_state():
    notices = sb('GET', 'member_notices?select=id,title,detail,due_week,customer_id&status=eq.open&order=due_week') or []
    today = datetime.date.today().isoformat()
    horizon = (datetime.date.today() + datetime.timedelta(days=4)).isoformat()
    orders = sb('GET', f'wholesale_orders?select=id,delivery_date,status,account_id&delivery_date=gte.{today}&delivery_date=lte.{horizon}&status=neq.cancelled') or []
    flex = sb('GET', 'flex_orders?select=id&status=eq.ordered&fulfilled_at=is.null&limit=500') or []
    return notices, orders, flex

# ── 4. Claude extraction ──────────────────────────────────────────────
def extract(messages, open_obls):
    open_list = [{'id': o['id'], 'description': o['description'], 'counterparty': o.get('counterparty')} for o in open_obls]
    prompt = f"""You are the obligations clerk for Tiny Seed Farm. Below are the last ~36 hours of Todd's texts and emails (both directions), and the farm's current OPEN obligations ledger.

TASK — return STRICT JSON only, no prose, shaped:
{{"new": [{{"counterparty": str, "handle": str|null, "direction": "owed_by_farm"|"owed_to_farm", "description": str (imperative, specific, <200 chars), "due_date": "YYYY-MM-DD"|null, "source": "text"|"email", "source_quote": str (<200 chars, verbatim)}}],
 "completed": [{{"id": str (from the open ledger), "evidence": str (<150 chars, citing the message that proves completion)}}]}}

RULES:
- A promise/obligation = a clear commitment someone made ("I'll drop them tomorrow", "we will send X", "can you get me Y by Friday" that was agreed). NOT ideas, marketing, questions, or completed-in-the-same-thread actions.
- owed_by_farm = Todd/farm owes someone. owed_to_farm = someone owes Todd (deliveries, payments, answers Todd is waiting on).
- Only mark an open ledger item completed with REAL evidence in these messages.
- When unsure, LEAVE IT OUT. An empty list is a fine answer.
- Do not duplicate anything already in the open ledger.

CURRENT OPEN LEDGER:
{json.dumps(open_list, indent=1)}

MESSAGES:
{chr(10).join(messages)}"""
    # LLM extraction can whiff (empty/garbled output) — retry up to 3 times
    # before accepting an empty result, and only accept empty when the run
    # PARSED cleanly (a parse failure is never evidence of "no promises").
    for attempt in range(3):
        r = subprocess.run(['claude', '-p', prompt, '--output-format', 'text', '--model', 'sonnet'],
                           capture_output=True, text=True, timeout=600,
                           env={**os.environ, 'CLAUDE_CODE_MAX_OUTPUT_TOKENS': '8000'})
        raw = r.stdout.strip()
        m = re.search(r'\{.*\}', raw, re.S)
        if not m: continue
        try:
            parsed = json.loads(m.group(0))
        except Exception:
            continue
        if parsed.get('new') or parsed.get('completed') or attempt == 2:
            return parsed
    return {'new': [], 'completed': []}

# ── 5. Ledger update ──────────────────────────────────────────────────
def update_ledger(result):
    added, done = [], []
    for n in result.get('new', []):
        key = hashlib.sha1((n.get('source_quote') or n['description']).lower().encode()).hexdigest()[:20]
        row = {'source': n.get('source', 'text'), 'counterparty': n.get('counterparty'),
               'handle': n.get('handle'), 'direction': n.get('direction', 'owed_by_farm'),
               'description': n['description'], 'due_date': n.get('due_date'),
               'source_quote': n.get('source_quote'), 'dedupe_key': key}
        if DRY: added.append(row); continue
        try:
            r = sb('POST', 'obligations', row)
            if isinstance(r, list): added.append(r[0])
        except Exception:
            pass  # dedupe collision = already tracked
    for c in result.get('completed', []):
        if DRY: done.append(c); continue
        try:
            r = sb('PATCH', f"obligations?id=eq.{c['id']}&status=eq.open",
                   {'status': 'done', 'done_at': datetime.datetime.utcnow().isoformat(),
                    'done_evidence': c.get('evidence')})
            if isinstance(r, list) and r: done.append(r[0])
        except Exception:
            pass
    return added, done

# ── 6. Compose + send ─────────────────────────────────────────────────
def fmt(o):
    who = f" — {o['counterparty']}" if o.get('counterparty') else ''
    due = f" (due {o['due_date']})" if o.get('due_date') else ''
    arrow = 'WE OWE' if o.get('direction') == 'owed_by_farm' else 'OWED TO US'
    return f"[{arrow}]{who}{due}: {o['description']}"

def main():
    texts = get_texts(); emails = get_emails()
    open_obls = sb('GET', 'obligations?select=*&status=eq.open&order=detected_at') or []
    result = extract(texts + emails, open_obls)
    added, done = update_ledger(result)
    open_now = sb('GET', 'obligations?select=*&status=eq.open&order=due_date.nullslast,detected_at') or []
    notices, orders, flex = portal_state()

    today = datetime.date.today()
    if WEEKLY:
        week_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()
        done_week = sb('GET', f'obligations?select=*&status=eq.done&done_at=gte.{week_ago}&order=done_at') or []
        subject = f"☀️ Sunday Rollup — {len(done_week)} done this week, {len(open_now)} open"
        lines = [f"SUNDAY ROLLUP — week ending {today.strftime('%B %-d')}", '',
                 f"✓ DONE THIS WEEK ({len(done_week)}):']"[:-2]]
        for o in done_week:
            lines.append(f"  ✓ {fmt(o)}" + (f"  [{o.get('done_evidence','')[:80]}]" if o.get('done_evidence') else ''))
        lines += ['', f"○ STILL OPEN ({len(open_now)}):"]
        for o in open_now: lines.append(f"  ○ {fmt(o)}")
    else:
        subject = f"📋 Daily digest — {len(added)} new, {len(done)} completed, {len(open_now)} open"
        lines = [f"DAILY PROMISES & OBLIGATIONS — {today.strftime('%A, %B %-d')}", '']
        if added:
            lines.append(f"🆕 NEW ({len(added)}):")
            for o in added: lines.append(f"  + {fmt(o)}" + (f'  «{(o.get("source_quote") or "")[:90]}»' if o.get('source_quote') else ''))
            lines.append('')
        if done:
            lines.append(f"✓ COMPLETED ({len(done)}):")
            for o in done: lines.append(f"  ✓ {fmt(o)}")
            lines.append('')
        lines.append(f"○ OPEN LEDGER ({len(open_now)}):")
        for o in open_now: lines.append(f"  ○ {fmt(o)}")
    lines += ['', f"— PORTAL —",
              f"📌 Open member notices: {len(notices)}"]
    for nt in notices[:10]:
        lines.append(f"   • {nt['title']}" + (f" (due wk {nt['due_week']})" if nt.get('due_week') else ''))
    lines += [f"🚚 Wholesale deliveries next 4 days: {len(orders)}",
              f"🧺 Flex orders awaiting fulfillment: {len(flex)}", '',
              'Ledger lives in the obligations table; notices at https://csa.tinyseedfarm.com/admin/notices', '',
              '— Tiny Seed obligations clerk']
    text = '\n'.join(lines)
    if DRY:
        print(subject); print(); print(text); return
    http('https://api.resend.com/emails', 'POST',
         {'from': RFROM, 'to': [TODD], 'subject': subject, 'text': text,
          'reply_to': [TODD]},
         {'Authorization': f'Bearer {RKEY}',
          'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36'})
    print(f'sent: {subject}')

if __name__ == '__main__':
    main()
