---
name: docx-cell-verification
description: python-docx row.cells SILENTLY DROPS cells containing content controls — my "verification" of the AIG form confirmed my own column-shift error. Verify .docx tables from the raw XML.
metadata:
  type: feedback
---

**Never verify a filled .docx table with `python-docx` `row.cells`. Read the raw
`row._tr.xml` and count `<w:tc>` elements.**

**Why:** on 2026-09-24 I filled PDA's AIG reimbursement template and shifted
every value one column right — `Equipment` landed in *Receipt Total* and the
dollar figure landed in *Amount to Reimburse*, the one column the form says is
PDA's to complete. I "verified" it, printed the row, and the output read
correctly. It read correctly because `row.cells` returned **4 values for a
5-cell row**: the Category cell holds a `<w:sdt>` dropdown, and the dedup path
dropped it. So my check silently deleted the very cell I had skipped, and the
remaining four lined up perfectly against the wrong headers.

Todd sent it. He caught the error himself from another terminal and had to send
a second email to his grant officer apologising for it. The verification did not
just fail to catch the bug — it manufactured the evidence that there wasn't one.

**How to apply:** for any .docx table that will leave the farm, extract per-cell
with:

```python
x = re.sub(r'\s+',' ', doc.tables[T].rows[R]._tr.xml)
cells = [''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', b))
         for b in re.split(r'(?=<w:tc>)', x) if '<w:tc>' in b]
```

Then assert `len(cells) == len(header)` and check each value against its header
by index. Also assert the arithmetic: line items must sum to the totals cell.
`<w:tcPr>` carrying `FFFF00` marks the cells the form wants filled — fill those
and only those.

The general rule this is an instance of: **a verification that reads through the
same abstraction that produced the artifact cannot catch the artifact's error.**
Drop a level. Read the bytes.

Related: [[aig-grants-status]]
