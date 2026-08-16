#!/usr/bin/env python3
"""Unpublish (remove from online store) all active à-la-carte produce (type=Veg)
products so CSA members must use the portal. Keeps CSA shares/add-ons/subs/
top-ups live. Products stay 'active' (POS/market unaffected) — only online
storefront visibility is removed. Reversible (republish anytime).

DRY RUN unless run with argument: GO
"""
import os, sys, time, json
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for p in (os.path.join(os.path.dirname(os.path.dirname(ROOT)), 'mcp-server', '.env'),
          os.path.join(ROOT, '.env')):
    if os.path.exists(p):
        for line in open(p):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip())

STORE = os.environ['SHOPIFY_STORE_NAME']
TOKEN = os.environ['SHOPIFY_ACCESS_TOKEN']
API = f'https://{STORE}.myshopify.com/admin/api/2024-10'
H = {'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'}
GO = len(sys.argv) > 1 and sys.argv[1] == 'GO'

EXCLUDE_KW = ('csa share', 'subscription', 'add-on', 'top-up', 'home delivery',
              'donation', 'pay it forward', 'custom', 'gift', 'tip', 'bloom bucket')

# Paginate all active products
def all_active():
    out = []
    url = f'{API}/products.json?limit=250&status=active&fields=id,title,status,published_at,product_type'
    while url:
        r = requests.get(url, headers=H); r.raise_for_status()
        out.extend(r.json().get('products', []))
        link = r.headers.get('Link', '')
        nxt = None
        for part in link.split(','):
            if 'rel="next"' in part:
                nxt = part[part.find('<')+1:part.find('>')]
        url = nxt
        time.sleep(0.6)
    return out

prods = all_active()
targets = []
for p in prods:
    if not p.get('published_at'):
        continue  # already unpublished
    if (p.get('product_type') or '').strip().lower() != 'veg':
        continue  # only the à-la-carte produce
    if any(k in p['title'].lower() for k in EXCLUDE_KW):
        continue
    targets.append(p)

print(f"{'EXECUTING' if GO else 'DRY RUN'} — {len(targets)} produce products to unpublish\n")
done = 0
for p in targets:
    if GO:
        r = requests.put(f"{API}/products/{p['id']}.json", headers=H,
                         data=json.dumps({'product': {'id': p['id'], 'published': False}}))
        ok = r.status_code == 200
        done += 1 if ok else 0
        print(f"  [{'OK' if ok else 'FAIL '+str(r.status_code)}] {p['title']}")
        time.sleep(0.6)
    else:
        print(f"  would unpublish: {p['title']}  (id {p['id']})")
if GO:
    print(f"\nUnpublished {done}/{len(targets)} produce products from the online store.")
