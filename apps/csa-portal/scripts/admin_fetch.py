#!/usr/bin/env python3
"""Fetch any admin page on the live CSA portal as admin (Todd) and print the body
to stdout. Usage: admin_fetch.py /admin/route-sheet/2026-06-15"""
import os, json, base64, sys
from urllib.parse import urlparse, parse_qs
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_env(path):
    if not os.path.exists(path): return
    for line in open(path):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip())
load_env(os.path.join(ROOT, '.env'))
load_env(os.path.join(os.path.dirname(os.path.dirname(ROOT)), '.env.csa'))

SUPABASE_URL = os.environ['SUPABASE_URL'].rstrip('/')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF', 'melizsvabemhaqeaqtyw')
SITE = 'https://csa.tinyseedfarm.com'
ADMIN_EMAIL = 'todd@tinyseedfarmpgh.com'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
b64url = lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')

r = requests.post(f'{SUPABASE_URL}/auth/v1/admin/generate_link',
    headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
             'Content-Type': 'application/json', 'User-Agent': UA},
    json={'type': 'magiclink', 'email': ADMIN_EMAIL, 'redirect_to': SITE + '/admin'})
r.raise_for_status()
r2 = requests.get(r.json()['action_link'], allow_redirects=False, headers={'User-Agent': UA})
q = parse_qs(urlparse(r2.headers.get('Location', '')).fragment)
access = q['access_token'][0]; refresh = q['refresh_token'][0]
expires_at = int(q.get('expires_at', ['0'])[0])
sub = json.loads(base64.urlsafe_b64decode(access.split('.')[1] + '=='))['sub']
session = {'access_token': access, 'refresh_token': refresh, 'expires_in': 3600,
           'expires_at': expires_at, 'token_type': 'bearer',
           'user': {'id': sub, 'aud': 'authenticated', 'role': 'authenticated', 'email': ADMIN_EMAIL}}
val = 'base64-' + b64url(json.dumps(session).encode())
name = f'sb-{PROJECT_REF}-auth-token'
cookies = {}
if len(val) > 3180:
    for i in range(0, len(val), 3180): cookies[f'{name}.{i//3180}'] = val[i:i+3180]
else: cookies[name] = val

path = sys.argv[1] if len(sys.argv) > 1 else '/admin/route-sheet/2026-06-15'
r3 = requests.get(SITE + path, cookies=cookies, headers={'User-Agent': UA})
sys.stderr.write(f'GET {path} -> {r3.status_code}, {len(r3.text)} bytes, final={r3.url}\n')
sys.stdout.write(r3.text)
