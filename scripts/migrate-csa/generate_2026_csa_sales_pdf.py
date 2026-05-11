#!/usr/bin/env python3
"""
generate_2026_csa_sales_pdf.py — 2026 Tiny Seed Sales PDF Report

Pulls SHOPIFY_Orders (orders) + SEEDLING_SALES (seedlings-tool sales) sheets,
categorizes every 2026 order by primary share type, color-codes sections,
shows per-order add-ons inline with the order, summarizes totals only at the end.

Categories (color-coded):
  🌱 Spring Veg     — green
  🥬 Summer Veg     — green-dark
  🌷 Flower         — magenta
  🔄 Flex CSA       — blue
  🌿 Seedlings (Shopify) — orange
  🛒 Market / Misc  — gray
  🌱 Seedlings Tool — orange  (from SEEDLING_SALES sheet, separate section)

Output: /Users/samanthapollack/Documents/TIny_Seed_OS/exports/TINY_SEED_2026_CSA_SALES.pdf
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

# ─── Categories ──────────────────────────────────────────────────────────────

# (key, label, icon, accent color, dark color)
CATEGORIES = [
    ("spring_veg",     "Spring Vegetable Shares",  "🌱", "#22c55e", "#15803d"),
    ("summer_veg",     "Summer Vegetable Shares",  "🥬", "#16a34a", "#14532d"),
    ("flower",         "Flower Shares + Bouquets", "🌷", "#be185d", "#831843"),
    ("flex",           "Flex CSA Shares",          "🔄", "#0284c7", "#075985"),
    ("addon_only",     "Stand-Alone Add-On Orders","🍞", "#ca8a04", "#854d0e"),
]
# Non-CSA categories dropped per Todd 2026-05-11:
#   "seedlings_shop" (Shopify seedling purchases — market, not CSA)
#   "market_misc"    (carrots, mint, scallions etc. — market sales)
# Orders categorized as non-CSA are now skipped entirely.
# Seedlings Tool section (from SEEDLING_SALES sheet) is kept as a separate section
# per Todd's earlier explicit request to see seedlings tool revenue.
CAT_LOOKUP = {c[0]: c for c in CATEGORIES}


def categorize_order(line_items: list[dict]) -> str:
    """Return the primary category for an order, ignoring add-on items.
    Priority: summer_veg > spring_veg > flower > flex > seedlings_shop > addon_only > market_misc"""
    has_summer = has_spring = has_flower = has_flex = has_seedling = has_addon = False
    has_market = False
    for it in line_items:
        t = (it.get("title") or it.get("name") or "").lower()
        if "add-on" in t or "addon" in t:
            has_addon = True
            continue
        if "summer" in t and ("share" in t or "csa" in t or "vegetable" in t):
            has_summer = True
        if "spring" in t and ("share" in t or "csa" in t or "vegetable" in t):
            has_spring = True
        if "flower" in t or "bouquet" in t or "bloom" in t or "fleurs" in t:
            has_flower = True
        if "flex" in t and ("csa" in t or "share" in t):
            has_flex = True
        # Seedling pattern: "Crop - Variety" with no "share"/"csa"
        if (
            " - " in t and "share" not in t and "csa" not in t and "add-on" not in t
            and ("tomato" in t or "pepper" in t or "basil" in t or "kale" in t
                 or "cucumber" in t or "tomatillo" in t or "snapdragon" in t
                 or "cosmos" in t or "kohlrabi" in t or "tarragon" in t
                 or "borage" in t or "lettuce" in t or "chard" in t
                 or "seedling" in t or "plant" in t)
        ):
            has_seedling = True
        # Market items: standalone produce with no "share"/"csa"
        if (
            "share" not in t and "csa" not in t and "add-on" not in t
            and any(kw in t for kw in ("carrot", "mint", "arugula", "scallion",
                                       "pickle", "custom sale", "branch", "home delivery"))
        ):
            has_market = True

    # Priority order — CSA-only after 2026-05-11 directive.
    if has_summer: return "summer_veg"
    if has_spring: return "spring_veg"
    if has_flower: return "flower"
    if has_flex:   return "flex"
    if has_addon and not (has_summer or has_spring or has_flower or has_flex):
        return "addon_only"
    # Everything else (market sales, Shopify-purchased seedlings) → not CSA, skip
    return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def load_sheets_token() -> str:
    with open("/tmp/access_token.txt") as f:
        for line in f:
            if line.startswith("NEW_ACCESS_TOKEN="):
                return line.strip().split("=", 1)[1]
    sys.exit("ERROR: refresh /tmp/access_token.txt first")


def fetch_sheet(sheet_name: str, token: str) -> list[dict]:
    r = requests.get(
        f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{sheet_name}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    r.raise_for_status()
    rows = r.json().get("values", [])
    if not rows:
        return []
    hdr = rows[0]
    return [dict(zip(hdr, row + [""] * (len(hdr) - len(row)))) for row in rows[1:]]


def safe_float(v) -> float:
    if v is None or v == "":
        return 0.0
    try:
        return float(str(v).replace("$", "").replace(",", "").strip())
    except Exception:
        return 0.0


def parse_li(raw: str) -> list[dict]:
    if not raw:
        return []
    try:
        v = json.loads(raw)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def html_escape(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;").replace("'", "&#39;"))


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("Fetching SHOPIFY_Orders…")
    token = load_sheets_token()
    orders_all = fetch_sheet("SHOPIFY_Orders", token)
    print(f"  total: {len(orders_all)}")

    print("Fetching SEEDLING_SALES…")
    seedling_sales = fetch_sheet("SEEDLING_SALES", token)
    print(f"  total: {len(seedling_sales)}")

    # ── Categorize 2026 Shopify orders ──────────────────────────────────────
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for o in orders_all:
        if "2026" not in (o.get("Created_At") or ""):
            continue
        li = parse_li(o.get("Line_Items_JSON", ""))
        if not li:
            continue
        cat = categorize_order(li)
        o["_line_items"] = li
        by_cat[cat].append(o)

    # Sort each category by date
    for cat in by_cat:
        by_cat[cat].sort(key=lambda x: x.get("Created_At", ""))

    # ── Categorize 2026 seedling-tool sales ─────────────────────────────────
    seedling_2026 = []
    for s in seedling_sales:
        date_str = s.get("Sale_Date") or s.get("Created_At") or ""
        if "2026" not in date_str:
            continue
        seedling_2026.append(s)
    seedling_2026.sort(key=lambda x: x.get("Sale_Date") or x.get("Created_At") or "")

    # ── Compute grand totals ─────────────────────────────────────────────────
    shopify_grand_total = sum(
        safe_float(o.get("Total_Price")) for orders in by_cat.values() for o in orders
    )
    seedling_tool_revenue = sum(
        safe_float(s.get("Revenue") or (safe_float(s.get("Price_Each")) * safe_float(s.get("Quantity_Sold"))))
        for s in seedling_2026
    )
    seedling_tool_units = sum(safe_float(s.get("Quantity_Sold")) for s in seedling_2026)

    csa_only_revenue = sum(
        safe_float(o.get("Total_Price"))
        for cat in ("spring_veg", "summer_veg", "flower", "flex", "addon_only")
        for o in by_cat.get(cat, [])
    )

    total_orders = sum(len(v) for v in by_cat.values())

    # ── Render HTML ─────────────────────────────────────────────────────────
    sections_html = []
    for key, label, icon, accent, accent_dark in CATEGORIES:
        orders = by_cat.get(key, [])
        if not orders:
            continue
        cat_total = sum(safe_float(o.get("Total_Price")) for o in orders)

        rows_html = []
        for o in orders:
            order_num = html_escape(o.get("Shopify_Order_Number") or o.get("Order_ID") or "")
            created = html_escape((o.get("Created_At") or "")[:10])
            name = html_escape(o.get("Customer_Name") or "")
            email = html_escape(o.get("Customer_Email") or "")
            total = safe_float(o.get("Total_Price"))
            items_lines = []
            for it in o["_line_items"]:
                t = html_escape((it.get("title") or it.get("name") or "(unknown)").strip())
                q = it.get("quantity", 1)
                is_addon = "add-on" in t.lower() or "addon" in t.lower()
                line_cls = "li-addon" if is_addon else "li-main"
                items_lines.append(f'<div class="{line_cls}">{q}× {t}</div>')
            items_html = "".join(items_lines) if items_lines else "<em>(no line items)</em>"
            rows_html.append(f"""
              <tr>
                <td class="ono">#{order_num}</td>
                <td class="dt">{created}</td>
                <td><strong>{name}</strong><br><span class="muted">{email}</span></td>
                <td class="items">{items_html}</td>
                <td class="amt">${total:,.2f}</td>
              </tr>""")

        sections_html.append(f"""
        <section class="cat" style="--accent:{accent}; --accent-dark:{accent_dark};">
          <h2><span class="cat-icon">{icon}</span> {html_escape(label)}
              <span class="cat-meta">{len(orders)} orders · ${cat_total:,.2f}</span></h2>
          <table>
            <thead>
              <tr>
                <th style="width: 65pt;">Order #</th>
                <th style="width: 55pt;">Date</th>
                <th style="width: 135pt;">Customer</th>
                <th>Items</th>
                <th style="width: 75pt; text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>{''.join(rows_html)}</tbody>
          </table>
        </section>""")

    # ── Seedlings Tool section (from SEEDLING_SALES sheet) ──────────────────
    if seedling_2026:
        # Aggregate by crop+variety
        prods = defaultdict(lambda: {"qty": 0, "rev": 0.0})
        for s in seedling_2026:
            key = f'{s.get("Crop","").strip()} – {s.get("Variety","").strip()}'
            qty = safe_float(s.get("Quantity_Sold"))
            rev = safe_float(s.get("Revenue") or (safe_float(s.get("Price_Each")) * qty))
            prods[key]["qty"] += qty
            prods[key]["rev"] += rev

        prod_rows = []
        for prod, stats in sorted(prods.items(), key=lambda kv: -kv[1]["rev"]):
            prod_rows.append(f"""
              <tr>
                <td>{html_escape(prod)}</td>
                <td class="num">{int(stats['qty'])}</td>
                <td class="amt">${stats['rev']:,.2f}</td>
              </tr>""")

        sections_html.append(f"""
        <section class="cat" style="--accent:#ea580c; --accent-dark:#9a3412;">
          <h2><span class="cat-icon">🌱</span> Seedlings Sales (from Seedlings Tool)
              <span class="cat-meta">{int(seedling_tool_units)} units · ${seedling_tool_revenue:,.2f}</span></h2>
          <table>
            <thead>
              <tr>
                <th>Crop – Variety</th>
                <th style="width: 65pt; text-align:right;">Qty Sold</th>
                <th style="width: 95pt; text-align:right;">Revenue</th>
              </tr>
            </thead>
            <tbody>{''.join(prod_rows)}</tbody>
          </table>
        </section>""")

    # Summary cards
    summary_cards = []
    for key, label, icon, accent, accent_dark in CATEGORIES:
        orders = by_cat.get(key, [])
        if not orders:
            continue
        total = sum(safe_float(o.get("Total_Price")) for o in orders)
        summary_cards.append(f"""
          <div class="card" style="--accent:{accent};">
            <div class="card-icon">{icon}</div>
            <div class="card-label">{html_escape(label)}</div>
            <div class="card-orders">{len(orders)} orders</div>
            <div class="card-rev">${total:,.0f}</div>
          </div>""")
    if seedling_2026:
        summary_cards.append(f"""
          <div class="card" style="--accent:#ea580c;">
            <div class="card-icon">🌱</div>
            <div class="card-label">Seedlings Tool</div>
            <div class="card-orders">{int(seedling_tool_units)} units</div>
            <div class="card-rev">${seedling_tool_revenue:,.0f}</div>
          </div>""")

    grand_total_all = shopify_grand_total + seedling_tool_revenue
    now = datetime.now().strftime("%B %-d, %Y at %-I:%M %p")
    run_dt = datetime.now().strftime("%Y-%m-%d %H:%M")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Tiny Seed Farm — 2026 Sales Report</title>
<style>
@page {{ size: letter portrait; margin: 0.5in; }}
* {{ box-sizing: border-box; }}
body {{
  font-family: -apple-system, "SF Pro Text", "Inter", Helvetica, Arial, sans-serif;
  color: #0f172a; font-size: 10pt; line-height: 1.4;
  margin: 0; padding: 0;
}}
h1 {{ font-family: "Barlow Condensed", "Inter", sans-serif; font-weight: 900;
     font-size: 36pt; margin: 0 0 4pt; letter-spacing: -0.5px; color: #15803d; }}
.hdr-sub {{ font-size: 11pt; color: #475569; margin-bottom: 4pt; }}
.tag {{ display: inline-block; background:#16a34a; color:#fff;
       padding: 2pt 8pt; border-radius: 999px;
       font-size: 9pt; font-weight: 600; letter-spacing: 0.5px;
       text-transform: uppercase; }}

.summary {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt;
           margin: 14pt 0 16pt; }}
.summary .card {{ border: 2px solid var(--accent, #16a34a); border-radius: 6pt;
                 padding: 8pt 10pt; background: #fff; position: relative; }}
.card-icon {{ font-size: 14pt; position: absolute; top: 6pt; right: 8pt; opacity: 0.6; }}
.card-label {{ text-transform: uppercase; font-size: 7.5pt; letter-spacing: 1px;
              color: #64748b; font-weight: 700; padding-right: 22pt; }}
.card-orders {{ font-size: 8.5pt; color: #475569; margin-top: 2pt; }}
.card-rev {{ font-family: "Barlow Condensed", "Inter", sans-serif;
            font-size: 18pt; font-weight: 800; color: var(--accent, #15803d);
            margin-top: 2pt; line-height: 1; }}

.cat {{ margin-top: 18pt; page-break-inside: auto; }}
.cat h2 {{
  font-family: "Barlow Condensed", "Inter", sans-serif; font-weight: 700;
  font-size: 17pt; margin: 12pt 0 6pt; color: var(--accent-dark);
  border-bottom: 3px solid var(--accent); padding-bottom: 3pt;
  display: flex; align-items: baseline; gap: 8pt;
}}
.cat-icon {{ font-size: 16pt; }}
.cat-meta {{ margin-left: auto; font-size: 10pt; color: #475569;
            font-family: "SF Mono", Menlo, monospace; font-weight: 500; }}

table {{ width: 100%; border-collapse: collapse; margin-top: 4pt; }}
thead th {{ background: var(--accent-dark); color: #fff; text-align: left;
           padding: 4pt 6pt; font-size: 8pt;
           text-transform: uppercase; letter-spacing: 0.5px; }}
tbody td {{ border-bottom: 1px solid #e2e8f0; padding: 4pt 6pt; vertical-align: top; font-size: 9pt; }}
tbody tr {{ page-break-inside: avoid; }}
tbody tr:nth-child(even) td {{ background: #f8fafc; }}
.ono {{ font-family: "SF Mono", Menlo, monospace; font-size: 8.5pt; color: #475569; white-space: nowrap; }}
.dt {{ font-family: "SF Mono", Menlo, monospace; font-size: 8.5pt; color: #475569; white-space: nowrap; }}
.amt {{ font-family: "SF Mono", Menlo, monospace; text-align: right; font-weight: 600;
        white-space: nowrap; font-size: 9pt; }}
.num {{ font-family: "SF Mono", Menlo, monospace; text-align: right; font-size: 9pt; color: #475569; }}
.muted {{ color: #64748b; font-size: 8.5pt; }}
.items {{ font-size: 8.5pt; line-height: 1.35; }}
.items .li-main {{ color: #0f172a; font-weight: 500; }}
.items .li-addon {{ color: #92400e; font-size: 8pt; margin-left: 8pt;
                    padding-left: 6pt; border-left: 2px solid #fcd34d; }}

.grand {{
  margin: 32pt 0 8pt; padding: 16pt 20pt; border: 3px double #15803d;
  border-radius: 8pt; background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  display: grid; grid-template-columns: 1fr 1fr; gap: 12pt;
}}
.grand .label {{ font-size: 10pt; color: #15803d; font-weight: 600;
                text-transform: uppercase; letter-spacing: 1px; }}
.grand .value {{ font-family: "Barlow Condensed", "Inter", sans-serif;
                font-size: 26pt; font-weight: 900; color: #14532d;
                margin-top: 2pt; line-height: 1; }}
.grand .total .value {{ font-size: 32pt; color: #15803d; }}

.footer {{ margin-top: 24pt; font-size: 8pt; color: #94a3b8; text-align: center; }}
.note {{ background: #fef9c3; border-left: 3px solid #ca8a04; padding: 6pt 10pt;
        margin: 8pt 0 14pt; font-size: 8.5pt; color: #713f12; border-radius: 0 4pt 4pt 0; }}
</style>
</head>
<body>

<div style="margin-bottom: 8pt;"><span class="tag">🌱 Tiny Seed Farm</span></div>

<h1>2026 Sales Report</h1>
<div class="hdr-sub">All Shopify orders + seedling-tool sales for 2026 — generated {now}</div>

<div class="note">
  <strong>Sources:</strong> SHOPIFY_Orders (categorized by primary line item) +
  SEEDLING_SALES (seedlings tool log). Add-ons appear inline with their order in
  the appropriate category. Grand total = Shopify total + Seedlings Tool total.
</div>

<div class="summary">
  {''.join(summary_cards)}
</div>

{''.join(sections_html)}

<div class="grand">
  <div>
    <div class="label">CSA Revenue (excluding misc)</div>
    <div class="value">${csa_only_revenue:,.2f}</div>
  </div>
  <div>
    <div class="label">Seedlings Tool Revenue</div>
    <div class="value">${seedling_tool_revenue:,.2f}</div>
  </div>
  <div style="grid-column: 1 / -1; border-top: 2px solid #15803d; padding-top: 8pt;">
    <div class="label">All 2026 Revenue (Shopify + Seedlings Tool)</div>
    <div class="value" style="font-size: 38pt; color: #15803d;">${grand_total_all:,.2f}</div>
    <div style="font-size: 9pt; color: #475569; margin-top: 2pt;">
      {total_orders} Shopify orders · {int(seedling_tool_units)} seedling units
    </div>
  </div>
</div>

<div class="footer">
  Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074 · Report run at {run_dt}
</div>

</body>
</html>"""

    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"  wrote HTML: {OUT_HTML}")

    # PDF
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if not Path(chrome).exists():
        print("  ⚠ Chrome not found; open the HTML manually + Print to PDF.")
        return
    print(f"  rendering PDF…")
    subprocess.run(
        [chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={OUT_PDF}", f"file://{OUT_HTML.resolve()}"],
        check=True, timeout=60,
    )
    print(f"  ✓ wrote PDF: {OUT_PDF} ({OUT_PDF.stat().st_size // 1024} KB)")
    print()
    print(f"Summary:")
    for key, label, icon, _, _ in CATEGORIES:
        orders = by_cat.get(key, [])
        if orders:
            total = sum(safe_float(o.get("Total_Price")) for o in orders)
            print(f"  {icon} {label:40s} {len(orders):4d} orders   ${total:>10,.2f}")
    print(f"  🌱 Seedlings Tool                          {int(seedling_tool_units):4d} units    ${seedling_tool_revenue:>10,.2f}")
    print(f"  {'─'*70}")
    print(f"     GRAND TOTAL                                          ${grand_total_all:>10,.2f}")


if __name__ == "__main__":
    main()
