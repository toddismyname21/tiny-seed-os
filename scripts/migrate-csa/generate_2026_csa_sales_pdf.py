#!/usr/bin/env python3
"""
generate_2026_csa_sales_pdf.py

Pulls all 2026 Shopify orders, filters to CSA-related (matching product titles
containing CSA / Share / Bouquet / Subscription / Vegetable), renders a styled
HTML report, then uses headless Chrome to print it to PDF.

Output: /Users/samanthapollack/Documents/TIny_Seed_OS/exports/TINY_SEED_2026_CSA_SALES.pdf

Usage:
  source scripts/migrate-csa/.venv/bin/activate
  python3 scripts/migrate-csa/generate_2026_csa_sales_pdf.py
"""

import json
import os
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import requests

SHEET_ID = "128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc"
OUT_DIR = Path("/Users/samanthapollack/Documents/TIny_Seed_OS/exports")
OUT_DIR.mkdir(exist_ok=True)
OUT_HTML = OUT_DIR / "TINY_SEED_2026_CSA_SALES.html"
OUT_PDF = OUT_DIR / "TINY_SEED_2026_CSA_SALES.pdf"


def load_sheets_token() -> str:
    with open("/tmp/access_token.txt") as f:
        for line in f:
            if line.startswith("NEW_ACCESS_TOKEN="):
                return line.strip().split("=", 1)[1]
    sys.exit("ERROR: refresh /tmp/access_token.txt first")


def fetch_shopify_orders(token: str) -> list[dict]:
    r = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/SHOPIFY_Orders",
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    r.raise_for_status()
    rows = r.json().get("values", [])
    if not rows:
        return []
    hdr = rows[0]
    return [dict(zip(hdr, row + [""] * (len(hdr) - len(row)))) for row in rows[1:]]


def is_csa_order(line_items: list[dict]) -> bool:
    keywords = ("csa", "share", "bouquet", "subscription", "vegetable", "flower")
    for item in line_items:
        title = (item.get("title") or item.get("name") or "").lower()
        if any(kw in title for kw in keywords):
            return True
    return False


def safe_float(v) -> float:
    if v is None or v == "":
        return 0.0
    try:
        return float(str(v).replace("$", "").replace(",", "").strip())
    except Exception:
        return 0.0


def parse_line_items(raw: str) -> list[dict]:
    if not raw:
        return []
    try:
        v = json.loads(raw)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def main():
    print("Fetching Shopify orders…")
    token = load_sheets_token()
    orders_all = fetch_shopify_orders(token)
    print(f"  total orders in sheet: {len(orders_all)}")

    # Filter to 2026 + CSA
    orders_2026_csa = []
    for o in orders_all:
        created = o.get("Created_At", "")
        if "2026" not in created:
            continue
        li = parse_line_items(o.get("Line_Items_JSON", ""))
        if not is_csa_order(li):
            continue
        o["_line_items"] = li
        orders_2026_csa.append(o)

    print(f"  2026 CSA orders: {len(orders_2026_csa)}")

    # Sort by created date
    orders_2026_csa.sort(key=lambda x: x.get("Created_At", ""))

    # Aggregate stats
    grand_total = 0.0
    grand_subtotal = 0.0
    grand_tax = 0.0
    product_totals: dict[str, dict] = defaultdict(lambda: {"qty": 0, "revenue": 0.0})

    for o in orders_2026_csa:
        grand_total += safe_float(o.get("Total_Price"))
        grand_subtotal += safe_float(o.get("Subtotal"))
        grand_tax += safe_float(o.get("Total_Tax"))
        for item in o["_line_items"]:
            title = (item.get("title") or item.get("name") or "(unknown)").strip()
            qty = int(item.get("quantity", 1) or 1)
            price = safe_float(item.get("price") or item.get("line_price"))
            product_totals[title]["qty"] += qty
            product_totals[title]["revenue"] += price * qty

    # ── Render HTML ──────────────────────────────────────────────────────────
    rows_html = []
    for o in orders_2026_csa:
        order_num = o.get("Shopify_Order_Number", "") or o.get("Order_ID", "")
        created = o.get("Created_At", "")[:10]  # ISO date
        name = o.get("Customer_Name", "")
        email = o.get("Customer_Email", "")
        total = safe_float(o.get("Total_Price"))
        items_lines = []
        for item in o["_line_items"]:
            t = (item.get("title") or item.get("name") or "(unknown)").strip()
            q = item.get("quantity", 1)
            items_lines.append(f"{q} × {t}")
        items_html = "<br>".join(items_lines) if items_lines else "(no line items)"
        rows_html.append(f"""
          <tr>
            <td class="num">#{order_num}</td>
            <td>{created}</td>
            <td><strong>{name}</strong><br><span class="muted">{email}</span></td>
            <td class="items">{items_html}</td>
            <td class="amt">${total:,.2f}</td>
          </tr>""")

    prod_rows = []
    for title, stats in sorted(product_totals.items(), key=lambda kv: -kv[1]["revenue"]):
        prod_rows.append(f"""
          <tr>
            <td>{title}</td>
            <td class="num">{stats['qty']}</td>
            <td class="amt">${stats['revenue']:,.2f}</td>
          </tr>""")

    now = datetime.now().strftime("%B %-d, %Y at %-I:%M %p")
    run_dt = datetime.now().strftime("%Y-%m-%d %H:%M")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Tiny Seed Farm — 2026 CSA Sales Report</title>
<style>
@page {{ size: letter portrait; margin: 0.5in; }}
* {{ box-sizing: border-box; }}
body {{
  font-family: -apple-system, "SF Pro Text", "Inter", Helvetica, Arial, sans-serif;
  color: #0f172a;
  font-size: 10pt;
  line-height: 1.4;
  margin: 0;
  padding: 0;
}}
h1 {{ font-family: "Barlow Condensed", "Inter", sans-serif; font-weight: 900;
     font-size: 36pt; margin: 0 0 4pt; letter-spacing: -0.5px; color: #15803d; }}
h2 {{ font-family: "Barlow Condensed", "Inter", sans-serif; font-weight: 700;
     font-size: 18pt; margin: 24pt 0 10pt; color: #0f172a;
     border-bottom: 2px solid #16a34a; padding-bottom: 4pt; }}
.hdr-sub {{ font-size: 11pt; color: #475569; margin-bottom: 4pt; }}
.tag {{ display: inline-block; background:#16a34a; color:#fff;
       padding: 2pt 8pt; border-radius: 999px;
       font-size: 9pt; font-weight: 600; letter-spacing: 0.5px;
       text-transform: uppercase; }}
.summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12pt;
           margin: 18pt 0 8pt; }}
.summary .card {{ border: 1.5px solid #e2e8f0; border-radius: 6pt; padding: 12pt;
                 background: #f8fafc; }}
.summary .label {{ text-transform: uppercase; font-size: 8pt; letter-spacing: 1px;
                  color: #64748b; font-weight: 600; }}
.summary .value {{ font-family: "Barlow Condensed", "Inter", sans-serif;
                  font-size: 22pt; font-weight: 800; color: #15803d;
                  margin-top: 2pt; line-height: 1; }}
table {{ width: 100%; border-collapse: collapse; margin-top: 6pt; }}
thead th {{ background: #15803d; color: #fff; text-align: left; padding: 6pt 8pt;
           font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }}
tbody td {{ border-bottom: 1px solid #e2e8f0; padding: 6pt 8pt; vertical-align: top; }}
tbody tr:nth-child(even) td {{ background: #f8fafc; }}
.num {{ font-family: "SF Mono", Menlo, monospace; font-size: 9pt; color: #475569; }}
.amt {{ font-family: "SF Mono", Menlo, monospace; text-align: right; font-weight: 600;
        white-space: nowrap; }}
.items {{ font-size: 9pt; line-height: 1.35; }}
.muted {{ color: #64748b; font-size: 9pt; }}
tfoot td {{ font-weight: 700; background: #15803d; color: #fff;
           padding: 8pt; font-size: 11pt; }}
tfoot .amt {{ font-size: 14pt; color: #fff; }}
.footer {{ margin-top: 30pt; font-size: 8pt; color: #94a3b8; text-align: center; }}
.note {{ background: #fef9c3; border-left: 3px solid #ca8a04; padding: 8pt 12pt;
        margin: 12pt 0; font-size: 9pt; color: #713f12; border-radius: 0 4pt 4pt 0; }}
</style>
</head>
<body>

<div style="margin-bottom: 12pt;">
  <span class="tag">🌱 Tiny Seed Farm</span>
</div>

<h1>2026 CSA Sales Report</h1>
<div class="hdr-sub">All Shopify CSA orders placed in 2026 — generated {now}</div>

<div class="summary">
  <div class="card">
    <div class="label">Total Orders</div>
    <div class="value">{len(orders_2026_csa)}</div>
  </div>
  <div class="card">
    <div class="label">Gross Revenue</div>
    <div class="value">${grand_total:,.0f}</div>
  </div>
  <div class="card">
    <div class="label">Subtotal</div>
    <div class="value">${grand_subtotal:,.0f}</div>
  </div>
  <div class="card">
    <div class="label">Tax</div>
    <div class="value">${grand_tax:,.0f}</div>
  </div>
</div>

<div class="note">
  <strong>Source:</strong> SHOPIFY_Orders sheet (raw Shopify orders, Created_At year=2026).
  <strong>CSA filter:</strong> line item title contains CSA / Share / Bouquet / Subscription / Vegetable / Flower.
  Excludes test orders (tips, refunds, non-CSA items). Numbers are gross — not net of refunds.
</div>

<h2>Product Breakdown</h2>
<table>
  <thead>
    <tr>
      <th>Product</th>
      <th style="width: 60pt; text-align:right;">Qty Sold</th>
      <th style="width: 90pt; text-align:right;">Revenue</th>
    </tr>
  </thead>
  <tbody>{''.join(prod_rows)}</tbody>
  <tfoot>
    <tr>
      <td>GRAND TOTAL</td>
      <td class="amt">{sum(p['qty'] for p in product_totals.values())}</td>
      <td class="amt">${sum(p['revenue'] for p in product_totals.values()):,.2f}</td>
    </tr>
  </tfoot>
</table>

<h2>Order Detail ({len(orders_2026_csa)} orders)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 60pt;">Order #</th>
      <th style="width: 65pt;">Date</th>
      <th style="width: 130pt;">Customer</th>
      <th>Items</th>
      <th style="width: 80pt; text-align:right;">Total</th>
    </tr>
  </thead>
  <tbody>{''.join(rows_html)}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">GRAND TOTAL</td>
      <td class="amt">${grand_total:,.2f}</td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074 · Report run at {run_dt}
</div>

</body>
</html>"""

    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"  wrote HTML: {OUT_HTML}")

    # ── HTML → PDF via headless Chrome ───────────────────────────────────────
    chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    chrome = next((p for p in chrome_paths if Path(p).exists()), None)
    if not chrome:
        print("  ⚠ No Chrome/Chromium/Edge found — open the HTML manually + Print to PDF.")
        print(f"  open {OUT_HTML}")
        return

    print(f"  rendering PDF via {Path(chrome).name}…")
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={OUT_PDF}",
            f"file://{OUT_HTML.resolve()}",
        ],
        check=True,
        timeout=60,
    )
    print(f"  ✓ wrote PDF: {OUT_PDF}")
    print(f"    Size: {OUT_PDF.stat().st_size // 1024} KB")
    print()
    print(f"Open with:  open {OUT_PDF}")


if __name__ == "__main__":
    main()
