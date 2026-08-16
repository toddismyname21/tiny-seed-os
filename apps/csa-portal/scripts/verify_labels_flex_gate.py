#!/usr/bin/env python3
"""Verify the labels flex-gate fix on the LIVE site by authenticating as admin
and fetching the rendered /admin/labels page. Confirms un-ordered flex members
are absent and ordered ones present. (Todd 2026-06-17 — verify against actual
output, not a DB query.)"""
import os, json, base64, sys
from urllib.parse import urlparse, parse_qs
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# load apps/csa-portal/.env (service role) + repo .env.csa (supabase url/ref)
def load_env(path):
    if not os.path.exists(path): return
    for line in open(path):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())
load_env(os.path.join(ROOT, '.env'))
load_env(os.path.join(os.path.dirname(os.path.dirname(ROOT)), '.env.csa'))

SUPABASE_URL = os.environ['SUPABASE_URL'].rstrip('/')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF', 'melizsvabemhaqeaqtyw')
SITE = 'https://csa.tinyseedfarm.com'
ADMIN_EMAIL = 'todd@tinyseedfarmpgh.com'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

def b64url(b): return base64.urlsafe_b64encode(b).decode().rstrip('=')

# 1. mint magic link
r = requests.post(f'{SUPABASE_URL}/auth/v1/admin/generate_link',
    headers={'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
             'Content-Type': 'application/json', 'User-Agent': UA},
    json={'type': 'magiclink', 'email': ADMIN_EMAIL, 'redirect_to': SITE + '/admin'})
r.raise_for_status()
action_link = r.json()['action_link']

# 2. follow WITHOUT redirect → tokens in Location hash
r2 = requests.get(action_link, allow_redirects=False, headers={'User-Agent': UA})
loc = r2.headers.get('Location', '')
frag = urlparse(loc).fragment or loc.split('#', 1)[-1]
q = parse_qs(frag)
access = q['access_token'][0]; refresh = q['refresh_token'][0]
expires_at = int(q.get('expires_at', ['0'])[0])
sub = json.loads(base64.urlsafe_b64decode(access.split('.')[1] + '=='))['sub']

# 3. build @supabase/ssr cookie
session = {'access_token': access, 'refresh_token': refresh, 'expires_in': 3600,
           'expires_at': expires_at, 'token_type': 'bearer',
           'user': {'id': sub, 'aud': 'authenticated', 'role': 'authenticated', 'email': ADMIN_EMAIL}}
val = 'base64-' + b64url(json.dumps(session).encode())
name = f'sb-{PROJECT_REF}-auth-token'
# chunk if >3180
cookies = {}
if len(val) > 3180:
    for i in range(0, len(val), 3180):
        cookies[f'{name}.{i//3180}'] = val[i:i+3180]
else:
    cookies[name] = val

# 4. fetch the live labels page for a stop
stop_id = sys.argv[1] if len(sys.argv) > 1 else '844cc892-a165-4925-831b-9e683d8c9db8'  # North Park
url = f'{SITE}/admin/labels/2026-06-15?stop={stop_id}'
r3 = requests.get(url, cookies=cookies, headers={'User-Agent': UA})
print(f'GET {url} -> {r3.status_code}, {len(r3.text)} bytes, final={r3.url}')
html = r3.text

present = [n for n in sys.argv[2:]] if len(sys.argv) > 2 else ['Ashley Lyons', 'Melissa Maxwell']
absent = ['Jackie Weaver', 'Lois Brown', 'Marian Dull', 'Tony Rozic']
print('\n--- EXPECT PRESENT (ordered flex / boxes) ---')
for n in present:
    print(f'  {"FOUND  " if n in html else "MISSING"}  {n}')
print('--- EXPECT ABSENT (flex, no order this week) ---')
for n in absent:
    print(f'  {"STILL THERE!" if n in html else "gone (good)"}  {n}')
# also report FLEX label count
print(f'\nFLEX badge occurrences on page: {html.count(">FLEX<")}')
