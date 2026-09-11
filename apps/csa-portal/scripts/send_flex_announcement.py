#!/usr/bin/env python3
"""
Weekly Farm Flex "list is open" announcement to active flex members.

Rebuilt 2026-09-11 — the ad-hoc scripts that sent the 8/9 and 8/15
flex_announcement blasts lived in /tmp on the old machine and are gone.
This is the permanent, repo-resident replacement.

RULES (do not weaken):
  - Copy is ALWAYS shown to Todd and explicitly approved before running.
  - Audience mirrors /api/cron/flex-order-reminder exactly:
      members.share_type='flex' AND members.status='active'
      AND customer.is_active is not false
      MINUS member_preferences.newsletter_opt_in=false
  - Every send is logged to notification_log (type 'flex_announcement',
    provider 'resend') — the log is the source of truth for "did it send".
  - Idempotent per week: refuses to run if flex_announcement rows already
    exist for today's date unless --force.

Usage:
  /usr/bin/python3 scripts/send_flex_announcement.py --week 2026-09-14 \
      --subject "..." --html-file body.html [--dry-run] [--force]

The HTML body may contain {first_name}; it is substituted per member
(falls back to "friend"). Run from apps/csa-portal (reads ./.env).
"""
import argparse
import datetime
import json
import sys
import time
import urllib.request

def env_file(path='.env'):
    out = {}
    for line in open(path):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            out[k] = v.strip().strip('"').strip("'")
    return out

def req(url, headers, data=None, method=None):
    r = urllib.request.Request(url, headers=headers,
                               data=json.dumps(data).encode() if data is not None else None,
                               method=method or ('POST' if data is not None else 'GET'))
    if data is not None:
        r.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(r) as resp:
        body = resp.read().decode()
        return resp.status, json.loads(body) if body else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--week', required=True, help='delivery week Monday YYYY-MM-DD (for the log)')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--html-file', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    env = env_file()
    sb_url = env.get('PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
    sb_key = env['SUPABASE_SERVICE_ROLE_KEY']
    resend_key = env['RESEND_API_KEY']
    from_email = env.get('RESEND_FROM_EMAIL', 'Tiny Seed Farm <hello@tinyseedfarm.com>')
    SB = {'apikey': sb_key, 'Authorization': f'Bearer {sb_key}'}

    # ── audience (mirrors flex-order-reminder) ──────────────────────────
    _, members = req(f"{sb_url}/rest/v1/members?select=id,customer_id,customer:customers!inner(email,contact_name,is_active)&share_type=eq.flex&status=eq.active", SB)
    members = [m for m in members if m['customer'] and m['customer'].get('is_active') is not False and m['customer'].get('email')]
    ids = ','.join(m['id'] for m in members)
    _, prefs = req(f"{sb_url}/rest/v1/member_preferences?select=member_id,newsletter_opt_in&member_id=in.({ids})&newsletter_opt_in=eq.false", SB)
    opted_out = {p['member_id'] for p in (prefs or [])}
    members = [m for m in members if m['id'] not in opted_out]

    # ── idempotency: refuse a second same-day blast ─────────────────────
    today = datetime.date.today().isoformat()
    _, prior = req(f"{sb_url}/rest/v1/notification_log?select=id&notification_type=eq.flex_announcement&sent_at=gte.{today}&limit=1", SB)
    if prior and not args.force:
        print(f"REFUSING: flex_announcement already sent today ({len(prior)}+ rows). Use --force to override.")
        sys.exit(1)

    html_tpl = open(args.html_file).read()
    print(f"audience: {len(members)} flex members | subject: {args.subject}")
    if args.dry_run:
        for m in members:
            print(' ', m['customer']['email'])
        print('DRY RUN — nothing sent.')
        return

    sent = failed = 0
    for m in members:
        email = m['customer']['email']
        first = (m['customer'].get('contact_name') or 'friend').split()[0]
        html = html_tpl.replace('{first_name}', first)
        try:
            status, out = req('https://api.resend.com/emails',
                              {'Authorization': f'Bearer {resend_key}'},
                              {'from': from_email, 'to': [email], 'subject': args.subject, 'html': html})
            ok = status in (200, 201)
            msg_id = (out or {}).get('id')
        except Exception as e:
            ok, msg_id, out = False, None, str(e)
        req(f"{sb_url}/rest/v1/notification_log", SB, {
            'member_id': m['id'], 'customer_id': m['customer_id'], 'channel': 'email',
            'notification_type': 'flex_announcement', 'recipient': email,
            'status': 'sent' if ok else 'failed', 'provider': 'resend',
            'provider_message_id': msg_id, 'subject': args.subject,
            'sent_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'error_message': None if ok else str(out)[:400],
            'metadata': {'week': args.week, 'script': 'send_flex_announcement.py'},
        })
        sent += ok
        failed += (not ok)
        print(('OK   ' if ok else 'FAIL ') + email)
        time.sleep(0.55)  # stay under Resend 2 req/s
    print(f"DONE sent={sent} failed={failed}")

if __name__ == '__main__':
    main()
