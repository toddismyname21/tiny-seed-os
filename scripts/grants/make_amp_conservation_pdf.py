#!/usr/bin/env python3
"""Build the AMP Conservation Practices report PDF for Tiny Seed Farm.
All payment scenarios are read from the verified dataset parsed out of
PA NRCS Bulletin 440-26-06 (FY26 EQIP/CSP published cost list)."""
import json, datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, KeepTogether)
from reportlab.lib.enums import TA_LEFT

SCEN = json.load(open('docs/grants/nrcs_sources/pa_fy26_scenarios.json'))
GREEN = colors.HexColor('#2f5d3a'); DARK = colors.HexColor('#1b1b1b')
LIGHT = colors.HexColor('#eef3ee'); RED = colors.HexColor('#8c2f28')
GREY  = colors.HexColor('#666666')

ss = getSampleStyleSheet()
def S(n, **kw):
    base = dict(name=n, fontName='Helvetica', fontSize=9.5, leading=13, textColor=DARK)
    base.update(kw); return ParagraphStyle(**base)
TITLE = S('t', fontName='Helvetica-Bold', fontSize=23, leading=27, textColor=GREEN, spaceAfter=4)
SUB   = S('s', fontSize=11.5, leading=15, textColor=GREY, spaceAfter=14)
H1    = S('h1', fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=GREEN,
          spaceBefore=16, spaceAfter=7)
H2    = S('h2', fontName='Helvetica-Bold', fontSize=11.5, leading=15, textColor=DARK,
          spaceBefore=11, spaceAfter=4)
BODY  = S('b', spaceAfter=6)
SMALL = S('sm', fontSize=8.5, leading=11.5, textColor=GREY)
NOTE  = S('n', fontSize=9, leading=12.5, textColor=RED)
BULL  = S('bu', leftIndent=13, bulletIndent=4, spaceAfter=3)

def uniq(code):
    seen, out = set(), []
    for x in sorted([s for s in SCEN if s['code'] == code], key=lambda y: -y['rate']):
        k = (x['scenario'], x['unit'])
        if k in seen: continue
        seen.add(k); out.append(x)
    return out

def money(v): return f"${v:,.2f}"

def scen_table(code, limit=40, hu=False):
    rows = [r for r in uniq(code) if hu or not r['scenario'].startswith('HU-')][:limit]
    if not rows: return Paragraph("<i>No Pennsylvania payment scenarios published for this code.</i>", SMALL)
    data = [[Paragraph('<b>Scenario — what you can actually do</b>', SMALL),
             Paragraph('<b>Unit</b>', SMALL), Paragraph('<b>PA FY26 rate</b>', SMALL)]]
    for r in rows:
        data.append([Paragraph(r['scenario'], SMALL), Paragraph(r['unit'], SMALL),
                     Paragraph(money(r['rate']), SMALL)])
    t = Table(data, colWidths=[4.5*inch, 0.6*inch, 1.0*inch], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), LIGHT),
        ('GRID',(0,0),(-1,-1), 0.4, colors.HexColor('#cccccc')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('ALIGN',(2,1),(2,-1),'RIGHT'),
        ('LEFTPADDING',(0,0),(-1,-1),4), ('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),2), ('BOTTOMPADDING',(0,0),(-1,-1),2),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor('#f8f8f8')]),
    ]))
    return t

def kv(rows, w=(2.1*inch, 4.0*inch)):
    data = [[Paragraph(f'<b>{a}</b>', SMALL), Paragraph(b, SMALL)] for a, b in rows]
    t = Table(data, colWidths=list(w))
    t.setStyle(TableStyle([
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('BACKGROUND',(0,0),(0,-1), LIGHT),
        ('LEFTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),3),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),
    ]))
    return t

# ---------------------------------------------------------------- content
TODAY = datetime.date.today().strftime('%B %-d, %Y')
story = []
A = story.append

A(Paragraph("AMP Conservation Practices", TITLE))
A(Paragraph("What the program will fund, what each practice actually contains, "
            "and the ten I would do first &mdash; Tiny Seed Farm", SUB))
A(kv([
    ("Prepared", TODAY),
    ("For", "Todd Wilson, Tiny Seed Farm LLC, Beaver County, Pennsylvania"),
    ("Program", "USDA Advancing Markets for Producers (AMP), administered by Pasa"),
    ("Scope", "The <b>36 conservation practices on Pasa's own list</b> &mdash; "
              "<i>Pasa Conservation Technical Assistance: List of Conservation Practices</i>. "
              "Nothing outside that list is recommended here."),
    ("Companion", "The Business Development half of AMP is budgeted separately in "
                  "<i>PASA_BD_PLAN_REVISED.md</i> ($14,952.43). This document is the "
                  "<b>conservation half only</b>."),
]))

A(Paragraph("How to read the dollar figures", H1))
A(Paragraph(
  "Pasa's practice list gives practice <b>names and codes</b> but no detail on what each one "
  "contains. That detail exists in the NRCS payment schedules, where every practice code is "
  "broken into named <b>scenarios</b> &mdash; the concrete, fundable variations of the practice. "
  "Those scenarios are the sub-lists in this report.", BODY))
A(Paragraph(
  "Every rate below was parsed from <b>Pennsylvania NRCS Bulletin PA 440-26-06</b>, "
  "“Pennsylvania published cost list and payment caps for FY 2026 EQIP and CSP contracts,” "
  "dated March 11, 2026. 1,835 scenario rows were extracted across 148 practice codes.", BODY))
A(Paragraph(
  "<b>IMPORTANT CAVEAT.</b> Those are <b>NRCS EQIP/CSP</b> rates. AMP conservation money is "
  "administered by Pasa, and <b>Pasa's payment rates may differ.</b> Use these figures to "
  "understand what each practice covers and roughly what it is worth &mdash; <b>not</b> as a "
  "quote of what AMP will pay. Confirm actual rates with Luka Hildebrandt.", NOTE))
A(Paragraph(
  "“HU-” scenarios are <b>Historically Underserved</b> rates, which run roughly 20% above "
  "base. Beginning farmers (first 10 years), veterans, socially disadvantaged and limited-resource "
  "producers qualify. <b>Todd should confirm whether he qualifies &mdash; it is free money if he does.</b> "
  "HU rows are omitted from the tables below for readability; assume roughly +20%.", BODY))

A(PageBreak())
A(Paragraph("The farm, from the FSA record", H1))
A(Paragraph("These figures were read on October 1&ndash;2, 2026 from the farm's own FSA "
            "GeoJSON field boundaries, not from recollection.", BODY))
A(Table([[Paragraph(f'<b>{h}</b>', SMALL) for h in
          ('Farm','Tract','Field','Land type','Acres','FSA cropland?')]] +
        [[Paragraph(str(c), SMALL) for c in row] for row in [
          ('1068','446','1','HEL','33.55','YES'),('1068','446','2','HEL','1.24','YES'),
          ('1068','446','3','UHEL','0.95','no'),('1068','446','4','UHEL','6.41','no'),
          ('1068','446','5','UHEL','20.79','no'),('1068','446','6','UHEL','3.74','no'),
          ('1079','1583','1','HEL','3.76','YES'),('1079','1583','2','UHEL','17.45','no'),
          ('1238','1783','1','HEL','5.50','YES'),('1238','1783','2','UHEL','1.38','no'),
          ('1238','1783','3','UHEL','2.64','no')]],
        colWidths=[0.8*inch,0.8*inch,0.7*inch,1.0*inch,0.9*inch,1.9*inch]) )
story[-1].setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), LIGHT),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),
    ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
    ('TEXTCOLOR',(0,1),(-1,2), RED),('TEXTCOLOR',(0,7),(-1,7), RED),('TEXTCOLOR',(0,9),(-1,9), RED),
]))
A(Spacer(1, 10))
A(Paragraph("The single most important fact in this report", H2))
A(Paragraph(
  "<b>Every acre FSA counts as cropland on this operation is classified Highly Erodible Land.</b> "
  "The cropland indicator is set on exactly the four HEL fields &mdash; 44.05 acres &mdash; and on "
  "none of the seven UHEL fields. 45% of the mapped 97.41 acres is HEL, and <b>100% of the "
  "cropland is.</b>", BODY))
A(Paragraph(
  "That matters three ways. It makes <b>soil erosion the documented, USDA-recognised resource "
  "concern</b> on all cropland, so erosion practices need no argument. It means conservation "
  "compliance already applies (the AD-1026 is certified and current). And HEL ground is typically "
  "<b>weighted favourably in conservation ranking</b>.", BODY))
A(Paragraph(
  "It also means Todd's own instinct &mdash; tarping to terminate a crop and <i>remove the tillage "
  "step</i> &mdash; is not merely convenient. <b>It is the textbook response to erodible cropland, "
  "and the program has a practice and a payment scenario for exactly it.</b>", BODY))
A(Spacer(1, 8))
A(kv([("Certification", "Certified organic, OEFFA, NOP ID 1600003839 &mdash; certified since "
        "12/11/2025, renewal due 04/25/2026"),
      ("Land tenure", "<b>All land is leased.</b> NRCS eligibility reads “<b>control</b> or own "
        "eligible land,” so a tenant qualifies &mdash; but landlord consent and lease term "
        "will matter for anything structural. Confirm with Luka."),
      ("Commodities (AMP)", "Salad greens and tomatoes"),
      ("Already practising", "cover crops, crop rotation, compost, drip irrigation, high tunnels"),
     ]))

A(PageBreak())
A(Paragraph("The Top Ten &mdash; what I would do, in order", H1))
A(Paragraph(
  "Ranked by what this farm actually is: 44 acres of highly erodible cropland, certified organic, "
  "salad greens and tomatoes, leased ground, an owner who already cover-crops, rotates and "
  "composts, and who has said he wants to stop tilling. Each entry says why it fits <i>here</i>, "
  "not why it is generally good.", BODY))

TOP = [
 ("1", "Residue and Tillage Management, Reduced Till &mdash; <b>NON-MECHANICAL</b>", "345",
  "<b>This is the practice for the tarps, and it is the highest-value match on the list.</b> "
  "“Non-Mechanical” reduced tillage means suppressing weeds and terminating a crop <i>without "
  "steel</i> &mdash; which is precisely occultation and solarisation. It pays per acre, not per "
  "tarp, and at $1,407.73/acre it is an order of magnitude above the per-acre tillage scenarios.",
  "Confirm with Luka that tarping is what PA means by Non-Mechanical before relying on it. If "
  "yes, this single line may justify the whole tarp purchase."),
 ("2", "Mulching &mdash; <b>Synthetic Material</b>", "484",
  "The other half of the tarp answer, and it settles a question that has been open for weeks: "
  "<b>Mulching 484 explicitly covers synthetic material, not just straw and woodchips.</b> "
  "Two scenarios apply &mdash; whole-area “Synthetic Material” per acre, and “Synthetic Material, "
  "Row” per 1,000 sq ft, which suits bed-width work.",
  "484 is also the conservation practice already named as the tie-in for the Business Development "
  "budget. Funding it here turns that from a stated intention into a funded, inspectable practice."),
 ("3", "Cover Crop &mdash; <b>Single Species, ORGANIC</b>", "340",
  "Todd already cover-crops, so this pays for work the farm does anyway. Note the structure: the "
  "<b>organic scenario pays $102.89/acre against $76.94 for conventional</b> &mdash; certification "
  "is worth a 34% premium on this line. There is also a “Mechanical Termination” scenario priced "
  "per 1,000 sq ft for small intensive blocks.",
  "Cheapest possible win. The practice is already happening; it needs documenting, not starting."),
 ("4", "Soil Carbon Amendment &mdash; <b>Compost, Onsite</b>", "336",
  "Pays per acre to apply compost. <b>This pairs directly with an AIG line that has never been "
  "spent:</b> Round 1 approved a $24,000 PTO compost turner, $16,000 of it PDA money, and that "
  "line expires 2027-06-30. AIG buys the machine that makes the compost; AMP pays to spread it.",
  "Two grants, two halves of one system, no overlap. Also the highest-leverage soil-health "
  "practice on intensively cropped vegetable ground."),
 ("5", "Residue and Tillage Management, <b>No-Till</b>", "329",
  "The headline erosion practice for land that is 100% HEL. Note the small-farm scenario: "
  "<b>“No-Till, Less Than Half Acre” is priced per 1,000 sq ft</b>, which is how intensive "
  "market-garden blocks actually get measured.",
  "Pair with 345 above &mdash; they are complementary, not alternatives. Ask Luka how PA "
  "distinguishes them so the acres are not double-counted."),
 ("6", "Pest Management Conservation System", "595",
  "Weed and pest pressure is the defining challenge of organic vegetable production, and this is "
  "the practice for it. PA publishes <b>explicit “Small Farm” scenarios</b> &mdash; Plant Health "
  "PAMS activities &mdash; running from $1,565 to $5,479 each. PAMS is Prevention, Avoidance, "
  "Monitoring and Suppression, which is the organic playbook written in NRCS language.",
  "Insect netting, which Todd has discussed, lives here rather than in Business Development."),
 ("7", "Contour Buffer Strips &mdash; <b>Specialty Crops</b>", "332",
  "The highest per-acre rate found anywhere in the list relevant to this farm: <b>$2,171.97/acre "
  "under the Specialty Crops scenario.</b> It is a foregone-income payment &mdash; compensation "
  "for taking strips out of production to break slope length. Tiny Seed grows specialty crops on "
  "33.55 acres of HEL in a single field.",
  "Worth a serious look specifically at Farm 1068 / Tract 446 / Field 1. Needs a conservation "
  "planner to lay out on the contour; that is what Luka is for."),
 ("8", "High Tunnel System", "325",
  "$5,524.04 base plus $4.89/sq ft for an enclosed tunnel, <b>capped at $10,000 per operating "
  "unit</b>. Relevant for a second reason: AIG Round 2 appears to have cut the $12,668 "
  "greenhouse and high-tunnel automation line, and <b>High Tunnel System is on Pasa's list</b>, "
  "so the conservation side may recover what the state program declined.",
  "Leased land makes a permanent structure a landlord conversation. Resolve tenure before "
  "designing anything."),
 ("9", "Irrigation System, Micro Irrigation", "441",
  "Same logic as the tunnels. AIG Round 2 most likely cut the $10,195 Toro Tempus irrigation "
  "line, and <b>Micro Irrigation 441 is on Pasa's list.</b> PA publishes a <b>“Small "
  "Microirrigation System” scenario at $1.31/sq ft, capped at $3,500</b>, plus base-cost "
  "scenarios for surface tape and PE-with-emitters.",
  "Potentially recovers a declined AIG item through a different program. Ask Luka."),
 ("10", "Field Border", "386",
  "Foregone-income payments for borders around cropland &mdash; $903.63/acre for pollinator "
  "borders, $575.36 native, $499.90 introduced. On erodible ground a vegetated border is both "
  "sediment control and beneficial-insect habitat, which feeds back into practice 595.",
  "The least disruptive practice on this list: it uses field edges rather than production beds."),
]
for n, title, code, why, note in TOP:
    A(KeepTogether([
        Paragraph(f"{n}. {title} &nbsp;<font color='#666666'>({code})</font>", H2),
        Paragraph(why, BODY),
        Paragraph(f"<b>Note.</b> {note}", SMALL),
        Spacer(1, 4),
        scen_table(code, limit=7),
        Spacer(1, 10)]))

A(Paragraph("Honourable mentions", H2))
A(Paragraph(
  "<b>Conservation Crop Rotation (328)</b> &mdash; already practised, 22 scenarios, worth "
  "documenting. <b>Nutrient Management (590)</b> &mdash; pairs with the farm's existing soil "
  "testing. <b>Composting Facility (317)</b> &mdash; $4,866.69 base plus $10.35/sq ft for a "
  "concrete-floor farm bin, which is the structure the AIG compost turner would feed. "
  "<b>Conservation Cover (327)</b> and <b>Hedgerow Planting (422)</b> for field margins.", BODY))

A(PageBreak())
A(Paragraph("All 36 AMP practices &mdash; the complete reference", H1))
A(Paragraph(
  "Every practice on Pasa's list, with its Pennsylvania payment scenarios. Practices are grouped "
  "by whether they can realistically apply to a leased, certified-organic vegetable farm with no "
  "livestock and no managed woodland. <b>Nothing here is outside Pasa's list.</b>", BODY))

APPLIES = [
 ('484','Mulching','Tarps/synthetic, straw, woodchips, erosion blanket. Lead practice.'),
 ('345','Residue and Tillage Mgmt, Reduced Till','Includes NON-MECHANICAL = tarping.'),
 ('329','Residue and Tillage Mgmt, No-Till','Small-farm scenario priced per 1,000 sq ft.'),
 ('340','Cover Crop','Organic scenario pays a premium over conventional.'),
 ('336','Soil Carbon Amendment','Compost and biochar, per acre or per 1,000 sq ft.'),
 ('328','Conservation Crop Rotation','Already practised on this farm.'),
 ('595','Pest Management Conservation System','Explicit Small Farm PAMS scenarios.'),
 ('590','Nutrient Management','Pairs with existing soil testing.'),
 ('325','High Tunnel System','Capped $10,000 per operating unit. Leased-land caveat.'),
 ('441','Irrigation System, Micro Irrigation','Small system scenario capped at $3,500.'),
 ('332','Contour Buffer Strips','Specialty Crops rate is the highest found.'),
 ('386','Field Border','Foregone-income payments on field edges.'),
 ('327','Conservation Cover','Permanent cover on land taken out of production.'),
 ('422','Hedgerow Planting','Field margins, beneficial habitat, windbreak.'),
 ('317','Composting Facility','Concrete-floor farm bin. Feeds the AIG compost turner.'),
 ('412','Grassed Waterway','For concentrated flow paths on HEL ground.'),
 ('612','Tree/Shrub Establishment','Margins and buffers.'),
 ('380','Windbreak/Shelterbelt Establishment','Wind erosion and crop protection.'),
 ('391','Riparian Forest Buffer','Only if a watercourse runs through the ground.'),
 ('311','Alley Cropping','Long-horizon agroforestry; hard on leased land.'),
 ('374','Farmstead Energy Improvement','67 scenarios &mdash; pack house, coolers, motors.'),
 ('670','Lighting System Improvement','36 scenarios &mdash; efficient lighting.'),
 ('382','Fence','Deer pressure is the realistic use here.'),
 ('575','Trails and Walkways','Capped $3.00/sq ft rock/gravel, $35,000/contract.'),
]
UNLIKELY = [
 ('338','Prescribed Burning','No use case on vegetable ground.'),
 ('379','Forest Farming','No managed woodland. No PA scenarios published.'),
 ('666','Forest Stand Improvement','No managed woodland.'),
 ('381','Silvopasture','Requires livestock. No PA scenarios published.'),
 ('512','Pasture and Hay Planting','No livestock.'),
 ('528','Prescribed Grazing','No livestock.'),
 ('516','Livestock Pipeline','No livestock.'),
 ('576','Livestock Shelter','No livestock. No PA scenarios published.'),
 ('614','Watering Facility','Livestock-oriented.'),
 ('472','Access Control','No PA scenarios published; livestock exclusion practice.'),
 ('603','Herbaceous Wind Barriers','No PA scenarios published. Ask Luka.'),
 ('636','Water Harvesting Catchment','No PA scenarios published. Ask Luka.'),
]
A(Paragraph("Applies to this farm", H2))
for code, name, note in APPLIES:
    n = len(uniq(code))
    A(KeepTogether([
        Paragraph(f"<b>{name}</b> <font color='#666666'>({code})</font> &mdash; "
                  f"<font color='#666666'>{n} PA scenarios</font>", BODY),
        Paragraph(note, SMALL), Spacer(1,3),
        scen_table(code, limit=6), Spacer(1,9)]))

A(PageBreak())
A(Paragraph("On Pasa's list but unlikely to fit", H2))
A(Paragraph("Listed for completeness, because the list is the list. Each is excluded for a "
            "stated reason, not skipped.", SMALL))
A(Spacer(1,5))
A(Table([[Paragraph('<b>Practice</b>',SMALL),Paragraph('<b>Code</b>',SMALL),
          Paragraph('<b>Why not here</b>',SMALL)]] +
        [[Paragraph(n,SMALL),Paragraph(c,SMALL),Paragraph(r,SMALL)] for c,n,r in UNLIKELY],
        colWidths=[2.0*inch,0.6*inch,3.5*inch]))
story[-1].setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIGHT),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]))

A(PageBreak())
A(Paragraph("Open questions &mdash; ask before committing", H1))
qs = [
 ("Is tarping what PA means by “Non-Mechanical” reduced tillage (345)?",
  "Luka", "This is recommendation #1. If the answer is no, the tarps fall back to 484 Synthetic."),
 ("What does AMP actually pay, as opposed to NRCS EQIP?",
  "Luka / Chris", "Every rate in this report is an EQIP/CSP rate used as a proxy."),
 ("Does Todd qualify for Historically Underserved rates?",
  "Todd / Luka", "Beginning farmer within 10 years, veteran, or limited-resource. Worth ~20%."),
 ("Leased land &mdash; what consent or lease term is required?",
  "Luka + landlord", "NRCS says “control or own.” Structures (325) are the sensitive case."),
 ("Is there any active NRCS EQIP or CSP contract on these fields?",
  "Todd", "AMP's double-dip rule bars funding the same commodity, practice OR field as another "
          "federal program. EQIP is federal. This is the one real conflict risk."),
 ("Which field grows the greens and tomatoes?",
  "Todd", "Still unanswered, and it blocks the Business Development filing too."),
 ("Do tarps go to Conservation or Business Development?",
  "Chris", "Rule 1 says Conservation. The BD ideas list says tarps. Rule 1 should govern."),
]
A(Table([[Paragraph('<b>Question</b>',SMALL),Paragraph('<b>Ask</b>',SMALL),
          Paragraph('<b>Why it matters</b>',SMALL)]] +
        [[Paragraph(q,SMALL),Paragraph(w,SMALL),Paragraph(r,SMALL)] for q,w,r in qs],
        colWidths=[2.3*inch,0.9*inch,2.9*inch]))
story[-1].setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIGHT),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))

A(Paragraph("Sources", H1))
for s in [
 "<b>Pasa Conservation Technical Assistance: List of Conservation Practices</b> &mdash; the 36 "
 "practices AMP will fund. Supplied by Chris Esposito. Local copy: "
 "<i>docs/grants/pasa_program_docs/Pasa List of NRCS Conservation Practices.pdf</i>",
 "<b>Pennsylvania NRCS Bulletin PA 440-26-06</b>, “Pennsylvania published cost list and payment "
 "caps for FY 2026 EQIP and CSP contracts,” March 11, 2026, expires September 30, 2026. 59 pages. "
 "Source of every scenario and rate. nrcs.usda.gov/sites/default/files/2026-04/",
 "<b>Pasa Business Development Program Overview</b> &mdash; eligibility rules, including rule 1 "
 "(conservation practices go to Conservation Implementation) and the double-dipping rule.",
 "<b>Tiny Seed Farm FSA field boundaries (GeoJSON)</b>, retrieved 2026-10-01 &mdash; farm, tract, "
 "field, land type (HEL/UHEL), acreage and cropland indicator.",
 "<b>PA NRCS EQIP and Organic Initiative program pages</b> &mdash; eligibility (“control or own "
 "eligible land”), organic funding structure, HEL compliance requirement.",
]:
    A(Paragraph(f"&bull; {s}", SMALL)); A(Spacer(1,4))
A(Spacer(1,8))
A(Paragraph(
  "Rates were extracted programmatically and validated by checking that every Historically "
  "Underserved rate exceeds its base rate &mdash; 712 pairs tested, 5 failures, all in Cover Crop, "
  "each corrected against the raw page. Zero anomalies remain. Where no scenario is published for "
  "a practice, this report says so rather than estimating.", SMALL))

# ---------------------------------------------------------------- build
def deco(canv, doc):
    canv.saveState()
    canv.setStrokeColor(GREEN); canv.setLineWidth(2)
    canv.line(0.75*inch, LETTER[1]-0.62*inch, LETTER[0]-0.75*inch, LETTER[1]-0.62*inch)
    canv.setFont('Helvetica', 7.5); canv.setFillColor(GREY)
    canv.drawString(0.75*inch, LETTER[1]-0.52*inch, "TINY SEED FARM  |  AMP CONSERVATION PRACTICES")
    canv.drawRightString(LETTER[0]-0.75*inch, LETTER[1]-0.52*inch, TODAY)
    canv.drawCentredString(LETTER[0]/2, 0.45*inch, f"page {doc.page}")
    canv.drawString(0.75*inch, 0.45*inch, "Rates are NRCS PA FY26 EQIP/CSP — confirm AMP rates with Pasa")
    canv.restoreState()

OUT = 'docs/grants/AMP_Conservation_Practices_TinySeedFarm.pdf'
doc = BaseDocTemplate(OUT, pagesize=LETTER, leftMargin=0.75*inch, rightMargin=0.75*inch,
                      topMargin=0.85*inch, bottomMargin=0.7*inch,
                      title="AMP Conservation Practices — Tiny Seed Farm",
                      author="Tiny Seed Farm")
doc.addPageTemplates([PageTemplate(id='n',
    frames=[Frame(0.75*inch, 0.7*inch, LETTER[0]-1.5*inch, LETTER[1]-1.55*inch)], onPage=deco)])
doc.build(story)
print("WROTE", OUT)
