#!/usr/bin/env python3
"""Talking points PDF for the Luka conservation meeting."""
import datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, KeepTogether)
G=colors.HexColor('#2f5d3a'); D=colors.HexColor('#1b1b1b'); L=colors.HexColor('#eef3ee')
GY=colors.HexColor('#666666'); R=colors.HexColor('#8c2f28')
def S(n,**k):
    b=dict(name=n,fontName='Helvetica',fontSize=9.5,leading=12.5,textColor=D); b.update(k)
    return ParagraphStyle(**b)
T=S('t',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=G,spaceAfter=3)
SU=S('su',fontSize=11,leading=14,textColor=GY,spaceAfter=12)
H1=S('h1',fontName='Helvetica-Bold',fontSize=14,leading=18,textColor=G,spaceBefore=14,spaceAfter=6)
H2=S('h2',fontName='Helvetica-Bold',fontSize=11,leading=14,spaceBefore=9,spaceAfter=4)
B=S('b',spaceAfter=5)
SM=S('sm',fontSize=8,leading=10.5,textColor=GY)
CELL=S('c',fontSize=8.5,leading=11)
SAY=S('say',fontSize=10.5,leading=14,leftIndent=12,textColor=colors.HexColor('#14532d'),
      spaceAfter=6,fontName='Helvetica-Bold')
NO=S('no',fontSize=9.5,leading=12.5,textColor=R,spaceAfter=5)
TODAY=datetime.date.today().strftime('%B %-d, %Y')
st=[]; A=st.append

def tbl(data,widths,hdr=True):
    t=Table(data,colWidths=widths,repeatRows=1 if hdr else 0)
    s=[('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),
       ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),
       ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]
    if hdr: s.append(('BACKGROUND',(0,0),(-1,0),L))
    t.setStyle(TableStyle(s)); return t

A(Paragraph("Conservation meeting — talking points", T))
A(Paragraph(f"Tiny Seed Farm &middot; with Luka Hildebrandt, Pasa Technical Assistance Provider "
            f"&middot; prepared {TODAY}", SU))

A(Paragraph("HOW TO RUN THIS MEETING", H1))
A(Paragraph("<b>Let them present first.</b> Pasa knows what gets approved and what their own "
            "case-study farms have done. If you open with a fixed list you foreclose that. "
            "<b>This meeting is for listening and for establishing what you are capable of.</b> "
            "The plan gets presented at the NEXT meeting.", B))
A(Paragraph("<b>You are recording.</b> So you do not need to take notes — you can listen properly "
            "and we process it afterwards.", B))
A(Spacer(1,4))
A(Paragraph("❌ DO NOT ASK ABOUT A PER-FARM CAP", H2))
A(Paragraph("No cap on conservation payments is published anywhere in Pasa's or USDA's "
            "materials, and USDA's own FAQ says producers are <b>not bound by payment "
            "limitations or AGI limitations</b>. <b>Raising it only invites one.</b> "
            "If Luka raises it, fine — otherwise the conversation is about what the farm "
            "should be doing, and the number follows.", NO))

A(Paragraph("OPEN WITH THIS", H1))
A(Paragraph("“I’m a certified Beginning Farmer — CCC-860 filed 02/01/2023, it’s on my FSA "
            "subsidiary print.”", SAY))
A(Paragraph("<b>Why it matters:</b> Beginning Farmer = Historically Underserved, which pays "
            "roughly <b>20% above base rate on every single practice</b>. It is already "
            "certified on a federal record, so there is nothing to prove and no reason not to "
            "say it in the first two minutes.", B))

A(Paragraph("THE FARM, IN ONE BREATH", H1))
A(tbl([[Paragraph('<b>Fact</b>',CELL),Paragraph('<b>Why it matters to them</b>',CELL)],
 [Paragraph("<b>100% of my FSA cropland is Highly Erodible Land</b> — all 44.05 ac",CELL),
  Paragraph("Erosion is <b>USDA's own documented concern</b> on every acre I crop. "
            "Conservation practices need no justification from me",CELL)],
 [Paragraph("Certified organic, OEFFA, NOP 1600003839",CELL),
  Paragraph("Several scenarios pay an organic premium; no rescue sprays means prevention "
            "is the only pest strategy",CELL)],
 [Paragraph("<b>Expanding 7.6 → 10–12 acres next year</b>",CELL),
  Paragraph("🔴 <b>Enrol at the PLANNED acreage.</b> A contract against 7.6 ac "
            "undersells by thousands",CELL)],
 [Paragraph("Three production clusters on three FSA farms, separated by woods",CELL),
  Paragraph("More perimeter per acre — matters for fencing and borders",CELL)],
 [Paragraph("I lease all my land from Don Kretschmann",CELL),
  Paragraph("Anything permanent needs his agreement. <b>Removable practices are easier "
            "and I will prefer them</b>",CELL)],
 [Paragraph("Salad greens (7 lines) + tomatoes; I irrigate from the pond",CELL),
  Paragraph("Two commodities; pond draw is what 636 would reduce",CELL)],
 [Paragraph("I keep field records, soil tests and harvest data in a farm management system",CELL),
  Paragraph("⭐ <b>Say this.</b> Adaptive Management needs documentation and most "
            "applicants have a notebook",CELL)]],
 [2.5*inch,4.2*inch]))

A(PageBreak())
A(Paragraph("THE QUESTIONS — in priority order", H1))
A(Paragraph("These are the ones I genuinely cannot answer from the published material. "
            "Everything else we can work out ourselves.", SM))
A(Spacer(1,5))
Q=[("1","How is the practice payment calculated — off the NRCS scenario rate, or off my actual invoices?",
    "Decides everything. If it is the scenario rate, practices we already do pay far above what they cost us. If it is invoices, it is cost-share and the whole plan changes shape."),
   ("2","For every practice with an ADAPTIVE MANAGEMENT variant, I want that one. What records do you need, and do my existing field records qualify?",
    "⭐ The single biggest lever. Cover Crop pays $6,075 flat under Adaptive Management vs $741 per-acre on my ground. Same cover crop, same beds, 8×."),
   ("3","Is the $10,000 High Tunnel cap per tunnel or per operating unit?",
    "I have five of my own tunnels. Per tunnel = $50,000. Per operation = $10,000. The bulletin never defines 'operating unit'."),
   ("4","For 484 Mulching, does our bed-scale tarping fall under 'Synthetic Material' or 'Synthetic Material, Row'?",
    "$3,003/ac vs $7,461/ac. Worth about $19,600 across the acres I would tarp."),
   ("5","On 441, I want a base-cost scenario — Microjet or Surface PE — not the Small System one.",
    "Small System is capped at $3,500. Microjet base is $8,501. Same practice code."),
   ("6","Can 329 No-Till and 345 Reduced Till both be claimed in the same year on different ground?",
    "$3,631 either way or in addition."),
   ("7","My compost design is 30×200 windrows, PTO-turned — the NOP windrow method. The only PA scenario prices concrete BINS. Is there a windrow scenario, or does 561 Heavy Use Area cover the pad?",
    "CPS 317 does not require concrete — it says 'consider' concrete and points to Compacted Soil Treatment and Heavy Use Area Protection."),
   ("8","A productive shrub hedgerow on my woods edge — does that go under 422 Hedgerow or 612 Tree/Shrub Establishment?",
    "612 pays $28.96 per plant, which is about 3.3× what 422 pays per foot for the same hedgerow."),
   ("9","Does my intensive bed-scale production qualify for the per-1,000-sq-ft scenarios rather than per-acre?",
    "⭐ This pattern appears in 328, 329, 386 and 484. On 7.6 acres the per-acre rate is consistently the wrong one. 386 'Extend or Diversify' is $5,552/ac equivalent vs $1,006/ac."),
   ("10","What electric deer fence design meets the 382 standard?",
    "A flat five-wire will not stop deer. I need to know what design qualifies before I build it."),
   ("11","Is there a PA rate for 636 Water Harvesting Catchment? I want to catch tunnel runoff and reduce my draw on the pond.",
    "No PA rate is published. Your own case study approved 636 for irrigation water storage."),
   ("12","Multi-year enrolment — the $1,500 stipend is yearly, so what term are we signing?",
    "")]
for n,q,why in Q:
    body=[Paragraph(f"<b>{n}.</b> {q}", SAY)]
    if why: body.append(Paragraph(why, SM))
    body.append(Spacer(1,7))
    A(KeepTogether(body))

A(PageBreak())
A(Paragraph("OUR IDEAS, PRACTICE BY PRACTICE", H1))
A(Paragraph("<b>If he asks “what would you do under this one?” — these are the answers.</b> "
            "All specific to our ground. Rates are PA FY26, Historically Underserved.", SM))

STACKS=[
("374","FARMSTEAD ENERGY — biggest stack. Each item a SEPARATE flat payment",[
 ("Variable speed drive on the chilled-water circulating pump","new wash-line loop","$1,459"),
 ("Scroll compressor replacement","walk-in cooler","$3,898"),
 ("Plate cooler — pre-cool wash water off well water before the ice tank","wash station","$5,377"),
 ("Automatic controller, multiple function — temp, vent and heat on one unit","greenhouse","$2,605"),
 ("Telemetry controller — remote cooler and greenhouse monitoring with alarms","cooler + greenhouse","$2,447"),
 ("High-efficiency exhaust fan, 48 inch or larger","30×90 tunnel / greenhouse","$2,467"),
 ("High-efficiency exhaust fans, 36–47 inch, two of them","cat tunnels","$1,728 ea"),
 ("NEMA Premium motor over 2 HP","irrigation pump","$1,594"),
 ("Variable speed drive, 1–10 HP motor","irrigation pump","$1,459"),
 ("Root-zone heating, roughly 300 linear feet of propagation bench","greenhouse","$966"),
 ("NEMA Premium motors, 2 HP or under","pack house spinners","$945 ea")]),
("595","PEST MANAGEMENT — PAMS, Small Farm scenario, $6,575 flat",[
 ("Insect netting over the brassica salad blocks","JS and F blocks","flea beetle is the defining pest"),
 ("Hoops and clips to carry the netting","per succession","goes on and off with the crop"),
 ("Weekly scouting programme — written counts, named thresholds, by block","all blocks","the documented backbone"),
 ("Beneficial habitat — beetle bank and pollinator borders","field edges","suppression leg of PAMS"),
 ("Trap crops on block edges","perimeter","pull flea beetle off the cash crop"),
 ("Sticky cards, hand lens, scouting kit","—","the monitoring hardware"),
 ("Row cover on early plantings","spring","exclusion before pressure builds"),
 ("Sanitation protocol — trays, pack house, prompt residue removal","—","prevention leg")]),
("484","MULCHING — tarps AND straw, different ground",[
 ("Black silage tarp, occultation between salad successions","F and JS blocks","Synthetic Material"),
 ("Clear film solarisation, July–August","worst weed-pressure blocks","Synthetic Material"),
 ("Straw mulch on tomatoes","FSA Field 1068/446/2","Natural Material"),
 ("Straw mulch on garlic, overwinter","—","Natural Material"),
 ("Straw mulch on perennial herbs","Don's 15×100","Natural Material"),
 ("Straw mulch on winter squash — keeps fruit off the soil","—","Natural Material"),
 ("Tarp reel or winder so tarps store dry and last","—","equipment"),
 ("Grow the straw on-farm, neighbour bales it","—","eliminates herbicide-carryover risk")]),
("340","COVER CROP — Adaptive Management, $6,075 flat",[
 ("Cereal rye after the last summer crop","overwinter","the workhorse"),
 ("Rye and hairy vetch where nitrogen is wanted","overwinter","legume mix"),
 ("Buckwheat in short summer gaps","30–45 days","between successions"),
 ("Oats, winterkilled, where an early spring bed is needed","fall","no spring termination"),
 ("Multi-species mix on ground going into tomatoes","Field 2","rooting depth and diversity"),
 ("Mechanical termination — flail or crimp, never tillage","—","feeds 345 and 329"),
 ("Interseeded clover as living mulch","trial block","")]),
("345/329","REDUCED TILL and NO-TILL — $6,075 and $3,631 flat",[
 ("Flail mow residue, tarp, replant — no steel in the soil","salad blocks","the standard turnover"),
 ("Designate no-till blocks explicitly against reduced-till blocks","K1, K2 no-till","keeps the two claims clean"),
 ("Dibble transplants into undisturbed beds","—","rather than forming fresh"),
 ("Permanent bed geometry — traffic never on beds","all blocks","paths stay paths"),
 ("Roller-crimp cover crops rather than incorporating","—",""),
 ("Weed pressure scored on a fixed scale, same blocks, every turnover","—","the honest measure"),
 ("A documented retreat — a block that fails and returns to reduced-till","—","that IS adaptive management")]),
("441","MICRO IRRIGATION — Microjet base cost $8,501",[
 ("Microjet over salad beds for hot-day evaporative cooling","salad blocks","cooling is a named purpose in CPS 441"),
 ("Surface PE with emitters on tomato and long-season beds","Field 2","lasts years, not a season"),
 ("Hoop House Surface Microirrigation, $0.40/sqft","8,100 sqft own tunnels","$3,240"),
 ("Filtration and pressure regulation on the pond draw","—","reduces plugging"),
 ("Zone valves so blocks irrigate independently","—",""),
 ("Soil moisture sensors to drive scheduling","—","records for the practice")]),
("327/386/422","HABITAT — paid on ground we are not cropping",[
 ("Beetle bank, 500 ft through the salad blocks","Field 1","422 at $5.39/ft"),
 ("Twenty-foot pollinator field border around Field 1","Field 1 perimeter","386 at $1,006/ac"),
 ("Native and pollinator conservation cover on tractor-turn corners","corners","327 at $1,061/ac"),
 ("Wildlife hedgerow on the woods edges, about 1,000 ft","cluster boundaries","422 or 612"),
 ("Productive hedgerow — elderberry, aronia, hazelnut","woods edge","habitat and a crop"),
 ("Flowering strips between the three clusters","—","pollinator corridor")]),
("336","SOIL CARBON AMENDMENT",[
 ("Spread our own compost across the production blocks","all blocks","$321/ac"),
 ("Biochar, if OEFFA confirms it is NOP-allowed","trial blocks","$1,712/ac"),
 ("Biochar and compost blended","—","$958/ac"),
 ("Test every compost batch so the rates are real","—","feeds 590"),
 ("Track soil organic matter by block, Logan Labs, annually","—","the proof")]),
("317","COMPOSTING FACILITY",[
 ("Thirty by two hundred foot windrow yard, PTO-turned","near the barn","the NOP windrow method"),
 ("Compacted stone and geotextile surface","—","CPS 317 does not require concrete"),
 ("Crown the pad and ditch above it","—","redirect upslope runoff, as the standard requires"),
 ("Site 50+ ft from water, 2 ft above seasonal high water table","—","standard siting criteria"),
 ("Temperature, feedstock and turning logs","—","NOP already requires these")]),
("325","HIGH TUNNEL",[
 ("Erect the 30×90 — ours, no negotiation needed","—","$10,000 cap"),
 ("Erect all four 15×90 caterpillar tunnels","—","standard allows durable plastic, 6 ft peak"),
 ("Winter salad production under cover","—","flagship crop when the field is dead"),
 ("In-ground growing only — benches do not qualify","—","CPS 325 criterion"),
 ("Gutter the tunnels to feed 636","—","water harvesting"),
 ("High-efficiency fan and controller in each","—","separate 374 payments")]),
("382","FENCE",[
 ("High-tensile electric, five or more wires","$3.41/ft","removable — far easier with the landlord"),
 ("Fence the highest-pressure cluster first","—","rather than all three at once"),
 ("Three-D or slanted design","—","a flat five-wire will not stop deer"),
 ("Gates wide enough for the tractor and the Mule","—",""),
 ("Solar energiser per cluster","—",""),
 ("Photographing deer damage now","—","the justification nobody ever has")]),
("636","WATER HARVESTING CATCHMENT",[
 ("Gutter the 30×90 tunnel and pipe to storage","—","high tunnels are named in CPS 636"),
 ("Gutter all four cat tunnels into a shared line","—",""),
 ("Storage tanks sized to about a week of irrigation","—",""),
 ("Feed the microjet system from stored water","—","reduces draw on the pond"),
 ("Frame it as reducing draw on Don's pond","—","an improvement that costs him nothing")]),
("590/328/575/670","THE QUIETER ONES",[
 ("590 — Logan Labs by block annually, written nutrient plan per block before the season, compost analysed each batch, documented adjustment","—","$2,999 flat"),
 ("328 — salad to fruiting to cover with family separation; straw grain year in the rotation; ask whether the OSP rotation plan satisfies it","—","$103/ac organic"),
 ("575 — geotextile and stone on the field-to-packhouse route and around the wash station","—","mud is a contamination route"),
 ("670 — LED and controller over the bagging table, greenhouse photoperiod controller, cooler door switches","—","$505 per controller")])]
for code,title,items in STACKS:
    body=[Paragraph(f"<b>{code} — {title}</b>", H2)]
    rows=[[Paragraph('<b>Idea</b>',CELL),Paragraph('<b>Where</b>',CELL),Paragraph('<b>Note</b>',CELL)]]
    for a_,b_,c_ in items:
        rows.append([Paragraph(a_,CELL),Paragraph(b_,CELL),Paragraph(c_,CELL)])
    body.append(tbl(rows,[3.5*inch,1.5*inch,1.7*inch]))
    body.append(Spacer(1,9))
    A(KeepTogether(body))

A(PageBreak())
A(Paragraph("ALL 36 PRACTICES PASA WILL FUND", H1))
A(Paragraph("From <i>Pasa Conservation Technical Assistance: List of Conservation Practices</i>. "
            "<b>Status column is my assessment, not theirs</b> — if Luka suggests something "
            "in a ❌ row, listen rather than argue. Rates are Pennsylvania FY26, "
            "Historically Underserved.", SM))
A(Spacer(1,5))
P=[("311","Alley Cropping","$16.10/ea","❌","Trees in crop alleys. Too long a horizon on leased ground, conflicts with machine cultivation"),
("317","Composting Facility","$5,840 + $12.42/sqft","⭐","WANT — 30×200 windrow yard. Scenario mismatch to resolve"),
("325","High Tunnel System","$6,629 + $5.87/sqft, cap $10k","✅","5 own tunnels to erect. Cap question"),
("327","Conservation Cover","$1,061/ac","✅","Native + pollinator on turn corners"),
("328","Conservation Crop Rotation","$103/ac organic","✅","Already doing. Ask about Specialty Crop Small"),
("329","Residue & Tillage, No-Till","$3,631 flat","✅","Adaptive Management"),
("332","Contour Buffer Strips","$2,203/ac","⏸️","Needs site visit — where would strips fall"),
("336","Soil Carbon Amendment","$321/ac compost, $1,712 biochar","✅","Spread own compost. Biochar if NOP-allowed"),
("338","Prescribed Burning","$105/ac","❌","No use on vegetable ground"),
("340","Cover Crop","$6,075 flat","✅","Adaptive Management. Already doing"),
("345","Residue & Tillage, Reduced","$6,075 flat","✅","Adaptive Management. This is the tarping practice"),
("374","Farmstead Energy Improvement","25 scenarios, mostly flat","⭐","BIGGEST STACK. Every motor, fan, compressor, controller"),
("379","Forest Farming","no PA rate","❌","No woodland access under the lease"),
("380","Windbreak / Shelterbelt","no PA rate","❌","Wind is not a problem here"),
("381","Silvopasture","no PA rate","❌","Requires livestock"),
("382","Fence","$3.41/ft electric, $8.14 woven","✅","Electric deer fence. Removable, easier with landlord"),
("386","Field Border","$1,006/ac pollinator","✅","20-ft border on Field 1"),
("391","Riparian Forest Buffer","$6,360/ac","❌","No stream or watercourse"),
("412","Grassed Waterway","$3,939/ac","⏸️","Where does water run after a storm?"),
("422","Hedgerow Planting","$5.39/ft beetle bank","✅","Beetle bank + woods-edge hedgerow"),
("441","Micro Irrigation","$8,501 microjet base","✅","Microjet for hot-day cooling + tunnel drip"),
("472","Access Control","no PA rate","❌","Livestock exclusion practice"),
("484","Mulching","$3,004–$7,461/ac","✅","Tarps on salad, straw on tomatoes"),
("512","Pasture and Hay Planting","$503/ac","❌","No livestock"),
("516","Livestock Pipeline","$1,648 base","❌","No livestock"),
("528","Prescribed Grazing","$267/ac","❌","No livestock"),
("575","Trails and Walkways","$1,902 base","✅","Mud between field and pack house. Food safety"),
("576","Livestock Shelter","no PA rate","❌","No livestock"),
("590","Nutrient Management","$2,999 flat","✅","Adaptive. Soil tests already bought"),
("595","Pest Management Conservation System","$6,575 flat Small Farm","✅","Insect netting + scouting. Scenario written for small farms"),
("603","Herbaceous Wind Barriers","no PA rate","❌","Wind is not a problem"),
("612","Tree/Shrub Establishment","$28.96/plant","✅","Fruit trees, hedgerow shrubs. Pasa's case study used this"),
("614","Watering Facility","$2,659 base","❌","Livestock-oriented"),
("636","Water Harvesting Catchment","no PA rate","✅","Tunnel runoff → storage → reduce pond draw"),
("666","Forest Stand Improvement","$2,583/ac","❌","No woodland access"),
("670","Lighting System Improvement","$505/controller","✅","Pack house + greenhouse. Stacks with 374")]
rows=[[Paragraph(f'<b>{h}</b>',CELL) for h in ("","Practice","PA rate (HU)","","Note")]]
for c,n,r,s,note in P:
    rows.append([Paragraph(c,CELL),Paragraph(n,CELL),Paragraph(r,CELL),
                 Paragraph(s,CELL),Paragraph(note,CELL)])
A(tbl(rows,[0.35*inch,1.55*inch,1.35*inch,0.3*inch,3.15*inch]))
A(Spacer(1,8))
A(Paragraph("✅ pursuing &nbsp;&nbsp; ⭐ priority &nbsp;&nbsp; ⏸️ needs a site visit "
            "&nbsp;&nbsp; ❌ not applicable here", SM))

A(PageBreak())
A(Paragraph("THINGS TO SAY IF THEY COME UP", H1))
for h,t_ in [("If asked what you want to do",
 "“Most of these I'm already doing — cover cropping, rotation, reduced tillage, organic pest "
 "management, composting, soil testing. What I need is to know which scenarios to enrol under "
 "and what records you want.”"),
 ("If asked about scale",
 "“7.6 acres of production now, going to 10 to 12 next year. Three clusters across three FSA "
 "farms. I want to enrol at the planned acreage.”"),
 ("If asked about the landlord",
 "“I lease everything. Removable practices are much easier for me — electric fence rather than "
 "woven wire, surface irrigation rather than buried. Anything permanent I need to take to Don "
 "first.”"),
 ("If they offer something unexpected",
 "⭐ “Tell me more about that.” — Then stop talking. This is the whole reason to let them "
 "present first."),
 ("If asked about timing",
 "“I know nothing can be implemented before the CPA-52 is approved. What's the realistic "
 "timeline on that, and what do you need from me to start it?”")]:
    A(Paragraph(h,H2)); A(Paragraph(t_,SAY))

A(Paragraph("THE ONE HARD GATE", H1))
A(Paragraph("🔴 <b>Nothing may be implemented before the CPA-52 environmental review is "
            "approved.</b> USDA's words: <i>“Producers cannot implement practice before an "
            "Environmental Evaluation is performed.”</i> Not tarps, not fence, not a compost "
            "pad. <b>The CPA-52 is the critical path — Luka writes it and submits to state "
            "NRCS.</b> Ask what he needs to start.", B))

def deco(canv,doc):
    canv.saveState()
    canv.setStrokeColor(G); canv.setLineWidth(2)
    canv.line(0.7*inch,LETTER[1]-0.6*inch,LETTER[0]-0.7*inch,LETTER[1]-0.6*inch)
    canv.setFont('Helvetica',7.5); canv.setFillColor(GY)
    canv.drawString(0.7*inch,LETTER[1]-0.5*inch,"TINY SEED FARM  |  CONSERVATION MEETING TALKING POINTS")
    canv.drawRightString(LETTER[0]-0.7*inch,LETTER[1]-0.5*inch,TODAY)
    canv.drawCentredString(LETTER[0]/2,0.42*inch,f"page {doc.page}")
    canv.drawString(0.7*inch,0.42*inch,"Listen first. Do not ask about a per-farm cap.")
    canv.restoreState()
OUT='docs/grants/Luka_Meeting_Talking_Points.pdf'
doc=BaseDocTemplate(OUT,pagesize=LETTER,leftMargin=0.7*inch,rightMargin=0.7*inch,
                    topMargin=0.8*inch,bottomMargin=0.65*inch,
                    title="Conservation meeting talking points — Tiny Seed Farm")
doc.addPageTemplates([PageTemplate(id='n',
    frames=[Frame(0.7*inch,0.65*inch,LETTER[0]-1.4*inch,LETTER[1]-1.45*inch)],onPage=deco)])
doc.build(st)
print("WROTE",OUT)
