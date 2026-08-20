#!/usr/bin/env python3
"""Generate print-friendly PDF from the Lease Markup Guide."""
import markdown
from weasyprint import HTML

# Read the markdown file
with open("/Users/samanthapollack/Documents/TIny_Seed_OS/legal/kretschmann_tiny_seed_lease/LEASE_MARKUP_GUIDE.md", "r") as f:
    md_content = f.read()

# Convert markdown to HTML
html_body = markdown.markdown(md_content, extensions=["tables", "fenced_code"])

# Wrap in full HTML with print-optimized CSS
html_full = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: letter;
    margin: 0.75in 0.75in 0.75in 0.75in;
    @bottom-center {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #666;
    }}
  }}

  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    max-width: 100%;
  }}

  h1 {{
    font-size: 20pt;
    font-weight: 700;
    border-bottom: 3px solid #1a1a1a;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 4px;
  }}

  h1 + h2 {{
    font-size: 11pt;
    font-weight: 400;
    color: #555;
    margin-top: 0;
    border-bottom: none;
    padding-bottom: 0;
  }}

  h2 {{
    font-size: 14pt;
    font-weight: 700;
    color: #1a1a1a;
    border-bottom: 2px solid #ccc;
    padding-bottom: 4px;
    margin-top: 24px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 12pt;
    font-weight: 700;
    color: #333;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }}

  h4 {{
    font-size: 11pt;
    font-weight: 700;
    color: #444;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  p {{
    margin: 6px 0;
    orphans: 3;
    widows: 3;
  }}

  ul, ol {{
    margin: 6px 0;
    padding-left: 24px;
  }}

  li {{
    margin: 3px 0;
  }}

  strong {{
    font-weight: 700;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}

  th {{
    background-color: #2c3e50;
    color: white;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #2c3e50;
  }}

  td {{
    padding: 5px 8px;
    border: 1px solid #ddd;
    vertical-align: top;
  }}

  tr:nth-child(even) {{
    background-color: #f7f7f7;
  }}

  /* Bold rows in tables (totals, emphasis) */
  td strong {{
    color: #c0392b;
  }}

  hr {{
    border: none;
    border-top: 1px solid #ccc;
    margin: 20px 0;
  }}

  blockquote {{
    border-left: 4px solid #2c3e50;
    margin: 10px 0;
    padding: 8px 16px;
    background: #f9f9f9;
    font-style: italic;
    color: #333;
  }}

  /* "How to say it" blocks - make them stand out */
  p:has(+ p) {{
    orphans: 3;
    widows: 3;
  }}

  /* Keep article sections together */
  h3 + ul {{
    page-break-inside: avoid;
  }}

  /* Margin notes area - leave right margin for handwritten notes */
  @media print {{
    body {{
      margin-right: 0;
    }}
  }}

  /* Section dividers */
  hr + h2 {{
    margin-top: 12px;
  }}

  /* Compact the recital/article tables */
  table + p {{
    margin-top: 8px;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

# Generate PDF
output_path = "/Users/samanthapollack/Documents/TIny_Seed_OS/legal/kretschmann_tiny_seed_lease/LEASE_MARKUP_GUIDE.pdf"
HTML(string=html_full).write_pdf(output_path)
print(f"PDF generated: {output_path}")
