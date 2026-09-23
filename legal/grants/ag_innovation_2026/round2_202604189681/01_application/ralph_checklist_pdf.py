#!/usr/bin/env python3
"""Generate Ralph's transplanter checklist PDF for Todd."""
from fpdf import FPDF
import os

class ChecklistPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 18)
        self.cell(0, 12, 'LANNEN TRANSPLANTER SETUP', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('Helvetica', '', 11)
        self.cell(0, 7, 'Checklist for Ralph @ Market Farm Implement', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('Helvetica', 'I', 9)
        self.cell(0, 6, 'ralph@marketfarm.com  |  Complete these items, then email Ralph with answers + photos', align='C', new_x='LMARGIN', new_y='NEXT')
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, 'Tiny Seed Farm  |  March 14, 2026  |  Get this done TOMORROW', align='C')

    def section_header(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_fill_color(34, 34, 34)
        self.set_text_color(255, 255, 255)
        self.cell(0, 9, f'  {title}', fill=True, new_x='LMARGIN', new_y='NEXT')
        self.set_text_color(0, 0, 0)
        self.ln(3)

    def checkbox_item(self, label, detail='', write_in=False):
        x = self.get_x()
        y = self.get_y()
        # Draw checkbox
        self.rect(x + 2, y + 1.5, 5, 5)
        # Label
        self.set_x(x + 10)
        self.set_font('Helvetica', 'B', 11)
        self.cell(0, 8, label, new_x='LMARGIN', new_y='NEXT')
        if detail:
            self.set_x(x + 10)
            self.set_font('Helvetica', '', 9)
            self.multi_cell(170, 5, detail)
            self.ln(1)
        if write_in:
            self.set_x(x + 10)
            self.set_font('Helvetica', '', 9)
            self.set_draw_color(180, 180, 180)
            self.cell(5, 8, 'Answer: ')
            line_y = self.get_y() + 7
            self.line(x + 25, line_y, 195, line_y)
            self.ln(10)
            self.set_draw_color(0, 0, 0)
        self.ln(1)


def sanitize(text):
    """Replace unicode chars that latin-1 can't encode."""
    return text.replace('\u2014', '--').replace('\u2013', '-').replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")

pdf = ChecklistPDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# Section 1: Tractor Info
pdf.section_header('SECTION 1: TRACTOR MEASUREMENTS (Go to the tractor)')

pdf.checkbox_item(
    'Tractor HP and Model',
    'Ralph needs the exact HP. You said "30-something HP Kubota." Get the exact model number off the tractor (e.g., Kubota L3301, L3800, etc.).',
    write_in=True
)

pdf.checkbox_item(
    'CAT I or CAT II Hitch?',
    sanitize('Check the 3-point hitch pins. CAT I = 7/8" diameter lower pins. CAT II = 1-1/8" lower pins. Ralph recommends CAT II for safety -- if yours is CAT I, he needs to know.'),
    write_in=True
)

pdf.checkbox_item(
    'Rear tire straddle measurement',
    'Measure the distance BETWEEN the two rear tires at the TREAD (where rubber meets the ground). NOT the balloon sidewalls. Use a tape measure on the ground.',
    write_in=True
)

pdf.checkbox_item(
    'Width of ONE rear tire',
    'Measure the width of just one rear tire at the tread where it contacts the ground. NOT the wider balloon sidewall.',
    write_in=True
)

pdf.checkbox_item(
    'Front-end weight or loader?',
    'Do you have front-end weights on the tractor OR a front-end loader? Ralph is concerned about counterbalance for lifting the transplanter. Yes/No + describe.',
    write_in=True
)

pdf.checkbox_item(
    'How much weight will the tractor lift?',
    'Check the Kubota specs (manual or Google "[model] 3-point lift capacity"). Ralph needs this to confirm safety.',
    write_in=True
)

pdf.checkbox_item(
    'Do you have a bigger tractor available?',
    'Ralph flagged 30HP may not be enough. If you have access to a larger tractor, mention it.',
    write_in=True
)

# Section 2: Bed Info
pdf.add_page()
pdf.section_header('SECTION 2: FIELD & BED INFO')

pdf.checkbox_item(
    'Raised beds? If yes: height and width of bed top',
    'If you transplant on raised beds, measure the height of the bed and the width of the flat top surface.',
    write_in=True
)

pdf.checkbox_item(
    'What HP tractor do you till with? What tillage tools & width?',
    'Ralph wants to understand your tillage system to check compatibility with row spacing.',
    write_in=True
)

pdf.checkbox_item(
    'How will you weed 3 rows at 14" or 4 rows at 12"?',
    'IMPORTANT: Ralph says most cultivators cannot weed below 15" rows effectively. He recommends 15"+ for best mechanical cultivation. Think about whether the Tilmor handles this, or if you need to adjust row spacing.',
    write_in=True
)

# Section 3: Transplanter Details
pdf.section_header('SECTION 3: LANNEN RT-20 TRANSPLANTER DETAILS')

pdf.checkbox_item(
    'Photo of ONE row unit from the side',
    'Take a clear photo of one of your 7 Lannen RT-20 row units from the SIDE view. Ralph needs this to identify the exact model variant. Email it with your answers.',
)

pdf.checkbox_item(
    'Do the drive belts turn the cups OK?',
    'Test each unit --do the belts that rotate the planting cups still work smoothly?',
    write_in=True
)

pdf.checkbox_item(
    'Are the spike belts OK?',
    'The spike belts hold the plant until the cup releases it. Check condition --Ralph says these wear out and are affected by sun/weather exposure.',
    write_in=True
)

pdf.checkbox_item(
    'How many cups on your row units?',
    'Count the planting cups on one row unit.',
    write_in=True
)

pdf.checkbox_item(
    'Are the depth shoes OK?',
    'Check the bottom shoes that control planting depth. Worn/damaged?',
    write_in=True
)

pdf.checkbox_item(
    'Do you need replacement parts?',
    'Ralph stocks some Lannen parts (drive belts, spike belts, cups, shoes). He also has 3 used Lannen row units --but says they ALL need new belts. List what you need.',
    write_in=True
)

# Section 4: Planting Specs
pdf.add_page()
pdf.section_header('SECTION 4: PLANTING SPECS')

pdf.checkbox_item(
    'What crops will you plant with the Lannen?',
    'List all crops (e.g., lettuce, kale, cabbage, onions, herbs, etc.).',
    write_in=True
)

pdf.checkbox_item(
    'What plug sizes / how many plugs per tray?',
    'e.g., 128-cell, 72-cell, 50-cell trays. Different cup sizes slip on for different plugs.',
    write_in=True
)

pdf.checkbox_item(
    'What in-row plant spacings do you want?',
    'Distance between plants in the row (e.g., 6", 8", 10", 12"). Different sprockets control this.',
    write_in=True
)

pdf.checkbox_item(
    'Do you have all the spacing sprockets you need?',
    'Each in-row spacing requires a specific sprocket on the row unit.',
    write_in=True
)

pdf.checkbox_item(
    'How many acres of 3-row (14") crops?',
    'Ralph needs to know volume to size the build correctly.',
    write_in=True
)

pdf.checkbox_item(
    'How many acres of 4-row (12") crops?',
    'Same --helps Ralph understand your scale.',
    write_in=True
)

# Section 5: Shipping
pdf.section_header('SECTION 5: LOGISTICS')

pdf.checkbox_item(
    'Mailing address (for quote)',
    'Confirm: 257 Zeigler Rd, Rochester, PA 15074',
)

pdf.checkbox_item(
    'Shipping address (if different)',
    'Some parts may be drop-shipped from other US locations.',
    write_in=True
)

pdf.checkbox_item(
    'Do you want Custom Lannen Tray Racks?',
    'Ralph says they may have some in stock --these are no longer being made. Ask about price.',
    write_in=True
)

# Bottom summary box
pdf.ln(5)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_fill_color(240, 240, 240)
pdf.cell(0, 8, '  WHEN DONE:', fill=True, new_x='LMARGIN', new_y='NEXT')
pdf.set_font('Helvetica', '', 10)
pdf.cell(0, 7, '  1. Take the side photo of one Lannen row unit', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 7, '  2. Fill in all answers above (or type them up)', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 7, '  3. Email everything to ralph@marketfarm.com', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 7, '  4. Say: "Best to email back so I can paste it into a quote" (his preference)', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 7, '  5. Ask for a written quote you can use for your PA Ag Innovation Grant application', new_x='LMARGIN', new_y='NEXT')

out_path = os.path.expanduser('~/Documents/TIny_Seed_OS/legal/grants/ag_innovation_2026/round2_202604189681/01_application/RALPH_TRANSPLANTER_CHECKLIST.pdf')
pdf.output(out_path)
print(f'PDF saved: {out_path}')
