#!/usr/bin/env python3
"""Generate the six Budget Builder evidence PDFs, named to Pasa's convention."""
import datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle)

G=colors.HexColor('#2f5d3a'); D=colors.HexColor('#1b1b1b'); L=colors.HexColor('#eef3ee')
GY=colors.HexColor('#666666')
def S(n,**k):
    b=dict(name=n,fontName='Helvetica',fontSize=9,leading=12,textColor=D); b.update(k)
    return ParagraphStyle(**b)
T=S('t',fontName='Helvetica-Bold',fontSize=17,leading=21,textColor=G,spaceAfter=3)
SU=S('su',fontSize=10,leading=13,textColor=GY,spaceAfter=12)
H=S('h',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=D,spaceBefore=10,spaceAfter=5)
B=S('b',spaceAfter=5)
SM=S('sm',fontSize=7.5,leading=9.5,textColor=GY)
CELL=S('c',fontSize=8,leading=10)
TODAY=datetime.date.today().strftime('%B %-d, %Y')

DATA = {
 "WashPackStation": ("Wash/Pack Station and Post-Harvest Handling", 3861.89, [
  ("Used stainless bagging table, 4'x6', casters, 2 bag openings",1,1500.00,
   "Facebook Marketplace listing, Essex Junction VT"),
  ("Buffer for add-ons / fittings to the table",1,500.00,"allowance"),
  ("Transport / drive to collect (approx 1,260 mi round trip)",1,500.00,
   "fuel + time; NOTE Pasa treats shipping as a separate expense"),
  ("Continuous band sealer with date + lot code hot-stamp printer",1,279.00,
   "VEVOR / FR-900 class, 4.2 stars / 199 reviews"),
  ("Greens washer stainless tri-clamp manifold - parts (itemised overleaf)",1,272.91,
   "Amazon, 304 stainless sanitary fittings"),
  ("Salad dryer replacement baskets, Hobart PESPIN-BASKET",2,404.99,
   "WebstaurantStore item 425PESPINBAS, ships free"),
 ]),
 "CoolingStorageLogistics": ("Cooling, Storage, and Logistics", 1991.21, [
  ("Forced-air cooler materials, 2 units (Univ. of Vermont design)",1,610.52,
   "lumber, fans, hardware - itemised in farm records"),
  ("Goulds 3657 centrifugal pump, 316 stainless, 3/4 HP, 115V",1,563.33,
   "rated for corrosive fluid handling in food processing"),
  ("Used stainless stock tank for ice reservoir",1,400.00,"Facebook Marketplace"),
  ("Stainless perforated ice basket, 5 gal, 1/4 in mesh",1,99.99,"Amazon, 4.1 stars"),
  ("2 in tri-clamp braided flexible hose, 304 stainless",2,45.49,"Amazon"),
  ("Reflective double-bubble insulation, 100 sq ft, R8",1,75.47,"Amazon"),
  ("DERNORD 2 in tri-clamp to hose barb adapter, 304 SS",4,16.99,"Amazon, 4.6 stars / 139"),
  ("DERNORD 2 in tri-clamp sanitary butterfly valve, 304 SS",1,31.99,"Amazon, 4.5 stars"),
  ("Tri-clamps with wing nut and gasket, 10 pack",1,42.99,"Amazon, 4.8 stars"),
  ("Silicone gaskets, 12 pack spares",1,7.98,"Amazon, 4.4 stars"),
 ]),
 "BusinessDevelopmentAndPlanning": ("Business Development and Planning", 1656.15, [
  ("Professional photography, 15 images",1,1000.00,
   "Photos By Aaron Sheedy published menu, February 2026 - attached separately"),
  ("Product labels, 5,000, custom printed",1,656.15,
   "UPrinting roll labels, verified $131.23 per 1,000 ($0.13 each)"),
 ]),
 "BrandBuildingAndMarketing": ("Brand Building and Marketing", 1524.16, [
  ("Custom vinyl product banners, 2ft x 4ft, full colour 13 oz (7 SKUs x 2 markets)",14,26.88,
   "Amazon custom banner, 4.7 stars"),
  ("Custom vinyl banner 3ft x 6ft - USDA ORGANIC status (1 per market)",2,36.96,
   "Amazon custom banner, 4.7 stars"),
  ("Custom vinyl banner 3ft x 6ft - farm identity (1 per market)",2,36.96,
   "Amazon custom banner, 4.7 stars"),
  ("Chalkboards - A-frame, hanging, tabletop, plus chalk markers",1,400.00,
   "A-frame chalkboard 40x20 rustic brown $61.99 (4.6 stars); hanging board $39.99; "
   "tabletop easel set $31.34; Chalk Ink markers $19.99"),
  ("'Won't You Be My Neighbor' CSA campaign - printed inserts for local builder "
   "new-homeowner welcome packets",1,600.00,"allowance, print quote pending"),
 ]),
 "MarketAndEventMaterial": ("Market & Event Material", 959.90, [
  ("8 ft folding tables, 660 lb capacity",1,270.00,"Amazon, 4.6 stars, $99.99 ea reference"),
  ("Custom printed tablecloths with farm logo, 6 ft fitted",10,38.99,"Amazon, 4.6 stars"),
  ("Branded wooden display containers - lumber, nails, screws",1,300.00,
   "materials only; build labour is in the labour line"),
 ]),
 "Other": ("Other", 2000.00, [
  ('48 in STRAIGHT flail mower, 3-point PTO, purchased used',1,2000.00,
   "Facebook Marketplace. Used for MECHANICAL WEED CONTROL and to cut and compost "
   "crop residue in place, eliminating a tillage pass on highly erodible cropland. "
   "Matches Pasa's own worked example of a fundable under-$10,000 general item."),
 ]),
}

for key,(cat,total,rows) in DATA.items():
    out=f"docs/grants/submission/TinySeedFarm_{key}.pdf"
    st=[]
    st.append(Paragraph("Tiny Seed Farm LLC", T))
    st.append(Paragraph(f"Cost documentation &mdash; <b>{cat}</b><br/>"
                        f"USDA Advancing Markets for Producers &middot; Business Development "
                        f"&middot; prepared {TODAY}", SU))
    data=[[Paragraph('<b>Item</b>',SM),Paragraph('<b>Qty</b>',SM),
           Paragraph('<b>Unit</b>',SM),Paragraph('<b>Total</b>',SM)]]
    for n,q,u,src in rows:
        data.append([Paragraph(f"{n}<br/><font size=6.5 color='#777777'>{src}</font>",CELL),
                     Paragraph(str(q),CELL),Paragraph(f"${u:,.2f}",CELL),
                     Paragraph(f"${q*u:,.2f}",CELL)])
    data.append([Paragraph('<b>CATEGORY TOTAL</b>',CELL),Paragraph('',CELL),Paragraph('',CELL),
                 Paragraph(f"<b>${total:,.2f}</b>",CELL)])
    t=Table(data,colWidths=[4.3*inch,0.5*inch,0.85*inch,0.85*inch],repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),L),('BACKGROUND',(0,-1),(-1,-1),L),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#cccccc')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('ALIGN',(1,1),(-1,-1),'RIGHT'),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    st.append(t)
    st.append(Spacer(1,12))
    st.append(Paragraph(
      "Prices were read from live retail listings on October 2, 2026. Where an item is "
      "marked as an allowance, a quote has not yet been obtained and the figure is an "
      "estimate. Pasa's Budget Builder accepts \"a screenshot of a store's price for items\" "
      "as documentation of cost; this schedule lists the same information in consolidated "
      "form, with the retailer and product identifiers named for each line.", SM))
    SimpleDocTemplate(out,pagesize=LETTER,leftMargin=0.8*inch,rightMargin=0.8*inch,
                      topMargin=0.8*inch,bottomMargin=0.7*inch,
                      title=f"Tiny Seed Farm - {cat}").build(st)
    print("wrote",out)
