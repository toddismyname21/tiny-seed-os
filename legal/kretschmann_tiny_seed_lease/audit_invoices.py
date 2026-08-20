#!/usr/bin/env python3
"""Audit every Kretschmann invoice: do the line items sum to the stated TOTAL?"""
import re, subprocess, glob, os

AMT = re.compile(r'(-?\(?\$?\s?[\d,]+\.\d{2}\)?)\s*$')

def money(s):
    s = s.strip().replace('$','').replace(',','').replace(' ','')
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    try: v = float(s)
    except ValueError: return None
    return -v if neg else v

rows=[]
for f in sorted(glob.glob('*.doc')):
    try:
        txt = subprocess.run(['textutil','-convert','txt','-stdout',f],
                             capture_output=True, text=True, timeout=30).stdout
    except Exception as e:
        rows.append((f, None, None, None, f'extract failed: {e}', [])); continue

    inv = re.search(r'\b(1048\d\d)\b', txt)
    inv = inv.group(1) if inv else '?'
    date = re.search(r'\b(\d{1,2}/\d{1,2}/\d{4})\b', txt)
    date = date.group(1) if date else '?'

    lines, total, payments = [], None, []
    for ln in txt.split('\n'):
        raw = ln.rstrip()
        if not raw.strip(): continue
        m = AMT.search(raw)
        if not m: continue
        v = money(m.group(1))
        if v is None: continue
        label = raw[:m.start()].strip()
        low = label.lower()
        if 'total' in low:
            total = v
        elif low.startswith('payment') or 'payment' in low:
            payments.append((label, v))
        elif re.search(r'\b1048\d\d\b', raw) and not label:
            continue
        else:
            lines.append((label, v))

    if total is None:
        rows.append((f, inv, date, None, 'NO TOTAL FOUND', lines)); continue
    s = round(sum(v for _,v in lines), 2)
    diff = round(total - s, 2)
    rows.append((f, inv, date, total, diff, lines))

bad=[]
print(f"{'INVOICE':<9} {'DATE':<11} {'FILE':<34} {'LINES':>10} {'TOTAL':>10} {'DIFF':>9}")
print('-'*88)
for f, inv, date, total, diff, lines in rows:
    if isinstance(diff, str):
        print(f"{inv:<9} {date:<11} {f[:34]:<34} {'':>10} {'':>10}  {diff}")
        continue
    s = round(sum(v for _,v in lines),2)
    flag = '' if abs(diff) < 0.005 else '  <<< MISMATCH'
    if flag: bad.append((f, inv, date, total, s, diff, lines))
    print(f"{inv:<9} {date:<11} {f[:34]:<34} {s:>10,.2f} {total:>10,.2f} {diff:>9,.2f}{flag}")

print('\n' + '='*88)
print(f"{len(rows)} invoices audited · {len(bad)} arithmetic mismatches")
for f, inv, date, total, s, diff, lines in bad:
    print(f"\n### {inv}  ({date})  {f}")
    for label, v in lines: print(f"     {label[:56]:<56} {v:>10,.2f}")
    print(f"     {'sum of lines':<56} {s:>10,.2f}")
    print(f"     {'stated TOTAL':<56} {total:>10,.2f}")
    print(f"     {'DIFFERENCE':<56} {diff:>10,.2f}")
