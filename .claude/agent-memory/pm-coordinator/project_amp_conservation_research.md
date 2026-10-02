---
name: amp-conservation-research
description: Where the AMP conservation practice data lives — 1,835 verified NRCS PA payment scenarios, and the two practices that fund tarping
metadata:
  type: project
---

**AMP conservation = the 36 practices on Pasa's own list.** Nothing outside it.
Source: `docs/grants/pasa_program_docs/Pasa List of NRCS Conservation Practices.pdf`

**The sub-lists Todd wanted are NRCS payment SCENARIOS.** Pasa's list gives codes
and names only; the scenarios are the concrete fundable variations.

| Artifact | Path |
|---|---|
| Verified scenario dataset, 1,835 rows / 148 codes | `docs/grants/nrcs_sources/pa_fy26_scenarios.json` |
| Source PDF, PA NRCS Bulletin 440-26-06, FY26 EQIP/CSP cost list, 59 pp | `docs/grants/nrcs_sources/PA_FY26_EQIP_CSP_COST_LIST.pdf` |
| Report generator (reads the JSON, never retyped numbers) | `scripts/grants/make_amp_conservation_pdf.py` |
| Report sent to Todd 2026-10-02, 13 pp | `docs/grants/AMP_Conservation_Practices_TinySeedFarm.pdf` |

⚠️ **Those are EQIP/CSP rates, not AMP rates.** Pasa administers AMP conservation
money and may pay differently. Use for scope and scale; confirm with Luka.

## The two practices that fund tarping — the weeks-old open question, answered

- **345 Residue & Tillage Mgmt, Reduced Till — "Non-Mechanical"** — terminating
  without steel, i.e. occultation/solarisation. Paid per acre.
- **484 Mulching — "Synthetic Material"** — **484 is NOT limited to straw and
  woodchips.** Synthetic is an explicit scenario, whole-area and per-row.

**How to apply:** tarps go to **Conservation Implementation, not Business
Development** — Pasa eligibility rule 1. That keeps the $15,000 BD budget whole.
Confirm the Non-Mechanical definition with Luka before relying on it.

**Validation method worth reusing:** every Historically Underserved rate must
exceed its base rate. 712 pairs tested, 5 failed, all Cover Crop, all corrected
from the raw page. A plausible parse is not a verified one.
